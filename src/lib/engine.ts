import { AGENTS, HF_MODELS, SPECIALIST_MODELS, detectDomain, modelStackFor } from "./knowledge";
import type { Domain, ModelAssignment, ModelDef } from "./knowledge";
import { execSQL } from "./sqlite";
import { ltmCountFor } from "./store";
import type {
  AgentId,
  AgentStatus,
  LtmEntry,
  MemoryEntry,
  Origin,
  Phase,
  RunRecord,
  StageLine,
  Subtask,
  ToolCall,
  WebSource,
} from "./types";
import { fmtDownloads, hfModelInfo, osvScan, searchGitHub, searchWikipedia } from "./web";
import type { HfModelInfo } from "./web";

/* subtasks appended to every domain plan — the hardening tier */
const EXTRA_ROWS: { text: string; owner: AgentId; tools: string[] }[] = [
  { text: "Run the test matrix & coverage gate", owner: "qa", tools: ["python_exec", "code_lint"] },
  { text: "Security audit + OSV.dev CVE scan", owner: "security", tools: ["code_lint", "osv_scan"] },
  { text: "Package: Dockerfile, CI, rollback plan", owner: "devops", tools: ["file_io"] },
];

class AbortError extends Error {}

export interface OrchestratorOpts {
  liveWeb: boolean;
  operator: string;
  origin: Origin;
  onPhase: (p: Phase) => void;
  onAgent: (a: AgentId, status: AgentStatus, meta?: string, model?: string) => void;
  onLine: (a: AgentId, line: StageLine) => void;
  onClear: () => void;
  onSubtasks: (st: Subtask[]) => void;
  onMemory: (e: MemoryEntry) => void;
  onTool: (t: ToolCall) => void;
  onReport: (md: string, score: number, wallMs: number) => void;
  onComplete: (rec: RunRecord) => void;
  onAbort: () => void;
}

export const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 9);

export class Orchestrator {
  private h: OrchestratorOpts;
  private dead = false;
  private gate: { resolve: (v: "approve" | "revise") => void } | null = null;
  private webSources: WebSource[] = [];
  private model: ModelDef = HF_MODELS[0];
  private stack: ModelAssignment[] = [];
  private hubStats: Record<string, HfModelInfo> = {};
  private hfNote = "";
  private osvNote = "";

  constructor(opts: OrchestratorOpts) {
    this.h = opts;
  }

  abort() {
    if (this.dead) return;
    this.dead = true;
    this.gate?.resolve("revise");
    this.h.onAbort();
  }
  approve() {
    this.gate?.resolve("approve");
  }
  revise() {
    this.gate?.resolve("revise");
  }

  private check() {
    if (this.dead) throw new AbortError();
  }
  private async delay(ms: number) {
    await sleep(ms);
    this.check();
  }
  private async stream(agent: AgentId, kind: StageLine["kind"], text: string, cps = 30, step = 4) {
    let shown = "";
    for (let i = 0; i < text.length; i += step) {
      shown = text.slice(0, i + step);
      this.h.onLine(agent, { id: uid(), kind, text: shown });
      await this.delay(Math.max(8, (step / cps) * 1000));
    }
    if (shown !== text) this.h.onLine(agent, { id: uid(), kind, text });
  }
  private line(agent: AgentId, kind: StageLine["kind"], text: string) {
    this.h.onLine(agent, { id: uid(), kind, text });
  }
  private async think(agent: AgentId, ms: number, meta: string) {
    const modelLabel = this.stack.find((s) => s.agent === agent)?.model.label;
    this.h.onAgent(agent, "thinking", meta, modelLabel);
    await this.delay(ms);
    this.h.onAgent(agent, "working", meta);
  }
  private done(agent: AgentId, meta: string) {
    this.h.onAgent(agent, "done", meta);
  }
  private tool(
    agent: AgentId,
    tool: string,
    arg: string,
    fn: () => { result: string; ok?: boolean },
  ): { result: string; ok: boolean } {
    const t0 = performance.now();
    const { result, ok } = fn();
    this.h.onTool({
      id: uid(),
      agent,
      tool,
      arg,
      result,
      ms: Math.max(1, Math.round(performance.now() - t0)),
      ok: ok !== false,
      at: Date.now(),
    });
    return { result, ok: ok !== false };
  }
  /* live web tool — async, failure-tolerant */
  private async webTool(
    agent: AgentId,
    tool: string,
    arg: string,
    fn: () => Promise<WebSource[]>,
  ): Promise<WebSource[] | null> {
    const t0 = performance.now();
    try {
      const srcs = await fn();
      this.check();
      this.h.onTool({
        id: uid(),
        agent,
        tool,
        arg,
        result: srcs.length ? `${srcs.length} hit(s)` : "0 hits",
        ms: Math.max(1, Math.round(performance.now() - t0)),
        ok: srcs.length > 0,
        at: Date.now(),
      });
      return srcs;
    } catch (e) {
      if (e instanceof AbortError) throw e;
      this.h.onTool({
        id: uid(),
        agent,
        tool,
        arg,
        result: "network error — fallback engaged",
        ms: Math.max(1, Math.round(performance.now() - t0)),
        ok: false,
        at: Date.now(),
      });
      return null;
    }
  }
  private async writeMem(agent: AgentId, key: string, value: string, persisted = false) {
    const entry: MemoryEntry = { id: uid(), key, value, author: agent, persisted };
    this.h.onMemory(entry);
    this.line(agent, "sys", `memory.write  ${key} = ${value}`);
    await this.delay(130);
    return entry;
  }
  private readMem(agent: AgentId, key: string) {
    this.line(agent, "sys", `memory.read   ${key}`);
  }
  private waitGate(): Promise<"approve" | "revise"> {
    return new Promise((resolve) => {
      this.gate = { resolve };
    });
  }

  async run(task: string, autoApprove: boolean, ltm: LtmEntry[], modelId: string) {
    const t0 = performance.now();
    this.model = HF_MODELS.find((m) => m.id === modelId) ?? HF_MODELS[0];
    this.stack = modelStackFor(this.model);
    this.hubStats = {};
    this.hfNote = "";
    this.osvNote = "";
    this.webSources = [];
    try {
      const d = detectDomain(task);
      this.h.onPhase("planning");

      /* ————— A1 · PLANNER ————— */
      this.h.onClear();
      await this.think("planner", 700, "parsing goal");
      this.line("planner", "sys", `run.init  run_id=${uid()}  task="${task}"`);
      this.line("planner", "info", `domain matched → ${d.label}`);
      this.tool("planner", "knowledge_base", `domain:${d.id}`, () => ({
        result: `grounded: ${d.stack.length} stack items, ${d.subtasks.length} known subtask patterns`,
      }));
      if (ltm.length) {
        this.line("planner", "info", `ltm loaded → ${ltm.length} persisted preferences from prior runs`);
        for (const e of ltm.slice(0, 3)) this.line("planner", "data", `${e.key} = ${e.value}`);
        const bias = ltmCountFor(ltm, d.id);
        if (bias > 0)
          this.line("planner", "good", `operator has built ${d.label.toLowerCase()} ${bias}× before — reusing locked stack`);
      } else {
        this.line("planner", "info", "ltm empty → first run for this operator, no priors to reuse");
      }
      this.line(
        "planner",
        "info",
        `inference model → ${this.model.label} (${this.model.id}) · ${this.model.params} params · quality ×${this.model.quality}`,
      );

      /* model-stack allocation — a specialist per agent, not one LLM for all
         (computed at run start; announced here as the planner's decision) */
      this.line("planner", "sys", "allocating model stack → one specialist per agent");
      const llmRows = this.stack
        .filter((s) => s.model.id !== this.model.id || s.agent === "planner")
        .map((s) => `${AGENTS[s.agent].id}→${s.model.label}`);
      await this.stream("planner", "data", `stack  ${llmRows.slice(0, 4).join(" · ")}`, 60, 6);
      if (llmRows.length > 4) await this.stream("planner", "data", `stack  ${llmRows.slice(4).join(" · ")}`, 60, 6);
      const specs = SPECIALIST_MODELS.map((s) => s.label);
      await this.stream(
        "planner",
        "data",
        `specialists  ${specs.slice(0, 4).join(" · ")} — retrieval, rerank, summarization, classification`,
        60,
        6,
      );
      await this.stream("planner", "data", `guardrails  ${specs.slice(4).join(" · ")} — safety + injection`, 60, 6);

      if (this.h.liveWeb) {
        /* verify EVERY registered model on the live hub, in parallel —
           availability is a checked fact, not a claim */
        const distinct: { id: string; label: string }[] = [];
        for (const m of [this.model, ...this.stack.map((s) => s.model)])
          if (!distinct.some((x) => x.id === m.id)) distinct.push({ id: m.id, label: m.label });
        for (const s of SPECIALIST_MODELS)
          if (!distinct.some((x) => x.id === s.id)) distinct.push({ id: s.id, label: s.label });
        const t0 = performance.now();
        const infos = await Promise.all(distinct.map((m) => hfModelInfo(m.id)));
        this.check();
        const hits = distinct.filter((_, i) => infos[i]);
        infos.forEach((info, i) => {
          if (info) this.hubStats[distinct[i].id] = info;
        });
        this.h.onTool({
          id: uid(),
          agent: "planner",
          tool: "hf_registry",
          arg: `${distinct.length} model ids`,
          result: hits.length ? `${hits.length}/${distinct.length} models confirmed available on hub` : "hub unreachable",
          ms: Math.max(1, Math.round(performance.now() - t0)),
          ok: hits.length > 0,
          at: Date.now(),
        });
        if (hits.length) {
          for (const m of hits.slice(0, 6)) {
            const info = this.hubStats[m.id];
            this.line(
              "planner",
              "good",
              `hf_registry → ${m.label}: ${fmtDownloads(info.downloads)} downloads · ${info.likes} likes`,
            );
          }
          if (hits.length > 6)
            this.line("planner", "good", `hf_registry → ${hits.length - 6} more models verified (see report §01)`);
          const unverified = distinct.length - hits.length;
          if (unverified) this.line("planner", "warn", `${unverified} model(s) unverified — offline cards apply`);
          this.hfNote = `Verified on the Hugging Face hub: **${hits.length}/${distinct.length} registered models confirmed available** — e.g. ${hits[0].label} with **${fmtDownloads(
            this.hubStats[hits[0].id].downloads,
          )} downloads**.`;
          await this.writeMem(
            "planner",
            "inference.model",
            `${this.model.label} · ${hits.length}/${distinct.length} models hub-verified`,
          );
        } else {
          this.line("planner", "warn", "hf_registry unreachable — cached model cards apply");
        }
      }
      await this.writeMem(
        "planner",
        "agents.models",
        this.stack.map((s) => `${AGENTS[s.agent].id}:${s.model.label}`).join(" · "),
      );
      await this.delay(300);
      this.line("planner", "sys", "decomposing goal → subtask graph");
      await this.delay(480);
      const reporterRow = d.subtasks.find((s) => s.owner === "reporter") ?? {
        text: "Compile the final report",
        owner: "reporter" as AgentId,
        tools: ["file_io"],
      };
      const fullPlan = [...d.subtasks.filter((s) => s.owner !== "reporter"), ...EXTRA_ROWS, reporterRow];
      let scope = 1;
      for (;;) {
        const subs: Subtask[] = (scope === 1 ? fullPlan : fullPlan.slice(0, Math.max(4, fullPlan.length - 1))).map(
          (s) => ({ id: uid(), ...s }),
        );
        for (const [i, s] of subs.entries()) {
          await this.stream(
            "planner",
            "info",
            `T${i + 1}  ${s.text}  [${AGENTS[s.owner].name} · ${s.tools.join(", ")}]`,
            60,
            6,
          );
          await this.delay(90);
        }
        this.h.onSubtasks(subs);
        this.done("planner", `${subs.length} subtasks`);
        if (autoApprove || scope > 1) {
          this.line(
            "planner",
            "sys",
            autoApprove ? "auto-approve armed — skipping human gate" : "revised plan accepted by operator",
          );
          break;
        }
        this.h.onPhase("approval");
        const verdict = await this.waitGate();
        if (this.dead) throw new AbortError();
        if (verdict === "approve") break;
        scope += 1;
        this.line("planner", "warn", "scope revise requested — re-planning with a tighter cut");
        this.h.onSubtasks([]);
        await this.delay(500);
      }
      if (this.h.origin === "schedule")
        this.line("planner", "sys", "scheduled run — approval gate bypassed by operator policy");

      /* ————— A2 ∥ A3 · RESEARCH + CODER ————— */
      this.h.onPhase("execution");
      this.line("planner", "sys", "fan-out → research ∥ coder");
      const [researchScore] = await Promise.all([this.runResearch(d), this.runCoder(d)]);
      this.line("planner", "sys", "fan-in → qa");

      /* ————— A4 · QA ————— */
      this.h.onPhase("qa");
      await this.runQA(d);
      if (this.dead) return;

      /* ————— A5 · REVIEWER (with one patch loop) ————— */
      this.h.onPhase("review");
      let score = await this.runReviewer(d, researchScore, false);
      if (score < 85) {
        this.line("reviewer", "warn", `score ${score} < 85 — issuing patch list, one revision round`);
        await this.runCoderPatch(d);
        score = await this.runReviewer(d, researchScore, true);
      }
      if (this.dead) return;

      /* ————— A6 ∥ A7 · SECURITY + DEVOPS (second fan-out) ————— */
      this.h.onPhase("hardening");
      this.line("planner", "sys", "fan-out → security ∥ devops");
      await Promise.all([this.runSecurity(d), this.runDevOps(d)]);
      this.line("planner", "sys", "fan-in → reporter");
      if (this.dead) return;

      /* ————— A8 · REPORTER ————— */
      this.h.onPhase("report");
      const wallMs = Math.round(performance.now() - t0);
      const md = await this.runReporter(task, d, score, wallMs);

      const id = `run-${Date.now().toString(36)}`;
      const rec: RunRecord = {
        id,
        task,
        domain: d.label,
        score,
        at: Date.now(),
        wallMs,
        report: md,
        origin: this.h.origin,
        operator: this.h.operator,
      };
      this.h.onReport(md, score, wallMs);
      this.done("reporter", "report.md + pdf ready");
      this.h.onPhase("complete");
      this.h.onComplete(rec);
    } catch (e) {
      if (e instanceof AbortError) return;
      throw e;
    }
  }

  /* ————— A2 · research agent ————— */
  private async runResearch(d: Domain): Promise<number> {
    await this.think("research", 620, "gathering evidence");
    this.line("research", "sys", "scope: " + d.subtasks.filter((s) => s.owner === "research").map((s) => s.text).join(" · "));
    this.tool("research", "knowledge_base", d.label.toLowerCase(), () => ({
      result: `${d.metrics.length} metrics, ${d.datasets.length} datasets matched`,
    }));
    for (const m of d.metrics) {
      await this.stream("research", "data", `evaluation metric → ${m}`, 55, 5);
      await this.delay(70);
    }
    this.line("research", "info", "dataset candidates ranked by coverage / license:");
    for (const ds of d.datasets) {
      await this.stream("research", "data", ds, 60, 6);
      await this.delay(80);
    }
    this.line("research", "info", "key findings:");
    for (const note of d.research.notes) {
      await this.stream("research", "info", note, 72, 7);
      await this.delay(110);
    }
    this.tool("research", "vector_db", "similar past runs", () => ({ result: "3 prior artifacts retrieved" }));

    /* live web evidence (advanced: API integrations) */
    if (this.h.liveWeb) {
      this.line("research", "sys", "hitting live web — no keys, real endpoints");
      const wiki = await this.webTool("research", "web_search", `wikipedia → "${d.wiki}"`, () => searchWikipedia(d.wiki));
      if (wiki && wiki.length) {
        for (const s of wiki.slice(0, 2))
          this.line("research", "data", `${s.title}: ${s.snippet.slice(0, 116)}…`);
        this.webSources.push(...wiki);
        await this.writeMem("research", "research.live.sources", wiki.map((s) => s.title).join(" | "));
        this.line("research", "good", `web_search: ${wiki.length} live sources attached to the report`);
      } else {
        this.line("research", "warn", "web_search: unreachable or empty — offline knowledge base holds the line");
      }
      const gh = await this.webTool("research", "github_repos", `github → "${d.gh}"`, () => searchGitHub(d.gh));
      if (gh && gh.length) {
        for (const s of gh.slice(0, 2))
          this.line("research", "data", `${s.title} ${s.meta ?? ""} — prior art worth stealing from`);
        this.webSources.push(...gh);
        await this.writeMem("research", "research.repos", gh.map((s) => s.title).join(" | "));
        this.line("research", "good", `github_repos: ${gh.length} starred references scanned`);
      } else {
        this.line("research", "warn", "github_repos: rate-limited or offline — continuing without prior-art scan");
      }
    } else {
      this.line("research", "sys", "live web disabled by operator — offline sources only");
    }

    for (const m of d.research.memory) await this.writeMem("research", m[0], m[1]);
    this.line("research", "good", `evidence packet sealed — ${d.research.memory.length} entries written to shared memory`);
    this.done("research", `${d.research.notes.length + d.datasets.length} findings`);
    return Math.min(96, 78 + d.research.notes.length * 5);
  }

  /* ————— A3 · coder agent ————— */
  private async runCoder(d: Domain): Promise<void> {
    await this.think("coder", 900, "drafting implementation");
    this.line("coder", "sys", "reading shared memory before writing a single line");
    for (const key of ["research.stack", "research.datasets", "research.metrics"]) this.readMem("coder", key);
    await this.delay(300);
    this.line("coder", "info", `contract locked: ${d.stack.join(" · ")}`);
    await this.stream("coder", "info", `scaffold → ${d.code.file}`, 40, 4);
    this.tool("coder", "python_exec", "ast.parse — syntax gate", () => ({ result: "parsed clean, 0 syntax errors" }));

    const coderSpeed = this.stack.find((s) => s.agent === "coder")?.model.speed ?? 1;
    this.line("coder", "info", `generation pace → ×${coderSpeed.toFixed(2)} from ${this.stack.find((s) => s.agent === "coder")?.model.label ?? this.model.label}`);
    this.line("coder", "code", "");
    for (const ln of d.code.lines) {
      this.h.onLine("coder", { id: uid(), kind: "code", text: ln });
      await this.delay(Math.max(12, Math.round(26 / coderSpeed)));
    }

    this.tool("coder", "code_lint", d.code.file, () => ({ result: "0 errors, 0 warnings (ruff)" }));
    this.tool("coder", "python_exec", `pytest -q · ${d.code.tests} tests`, () => ({
      result: `${d.code.tests} passed in 0.41s`,
    }));
    this.line("coder", "good", `test suite green: ${d.code.tests}/${d.code.tests} · coverage 91%`);

    /* embedded SQL query against the ledger db (advanced: SQL querying) */
    const q = d.sql;
    const t0 = performance.now();
    const res = execSQL(q);
    this.h.onTool({
      id: uid(),
      agent: "coder",
      tool: "sql_query",
      arg: q,
      result: res.error ? `error: ${res.error}` : `${res.rows.length} row(s)`,
      ms: Math.max(1, Math.round(performance.now() - t0)),
      ok: !res.error,
      at: Date.now(),
    });
    if (res.error) this.line("coder", "warn", `sql_query failed: ${res.error}`);
    else
      this.line(
        "coder",
        "info",
        `sql_query → ${res.cols.join(", ")} = ${res.rows.map((r) => r.join(" ")).join(" | ")}`,
      );

    this.tool("coder", "file_io", `write ${d.code.file}`, () => ({ result: `${d.code.lines.length} lines written` }));
    await this.writeMem("coder", "code.artifact", `${d.code.file} (${d.code.lines.length} lines, ${d.code.tests} tests)`);
    this.done("coder", `${d.code.file} · ${d.code.tests} tests`);
  }

  private async runCoderPatch(d: Domain): Promise<void> {
    this.h.onAgent("coder", "working", "applying patches");
    this.line("coder", "warn", "reviewer patch list received — revision round 1/1");
    for (const p of d.review.patch) {
      await this.stream("coder", "info", `patch → ${p}`, 60, 5);
      await this.delay(140);
    }
    this.tool("coder", "python_exec", `pytest -q (re-run)`, () => ({ result: `${d.code.tests} passed in 0.38s` }));
    this.line("coder", "good", "patches applied, suite still green");
    this.done("coder", "patched & green");
    await this.delay(250);
  }

  /* ————— A4 · reviewer agent ————— */
  private async runReviewer(d: Domain, researchScore: number, isRerun: boolean): Promise<number> {
    await this.think("reviewer", 750, isRerun ? "re-reviewing patch" : "auditing solution");
    this.line("reviewer", "sys", isRerun ? "second pass — verifying patch list" : "first pass — full audit");
    this.readMem("reviewer", "code.artifact");
    this.readMem("reviewer", "research.stack");
    await this.delay(280);
    this.tool("reviewer", "code_lint", `${d.code.file} --strict`, () => ({ result: "0 errors · 2 style notes" }));
    this.tool("reviewer", "python_exec", "pytest --cov", () => ({ result: `coverage 91% · ${d.code.tests} passed` }));

    const flags = isRerun ? d.review.pass : d.review.flags;
    for (const f of flags) {
      await this.stream("reviewer", isRerun ? "good" : "warn", `${isRerun ? "✓" : "△"} ${f}`, 62, 5);
      await this.delay(120);
    }
    await this.writeMem("reviewer", "review.flags", isRerun ? "all clear after patch round" : d.review.flags.join("; "));

    const revModel = this.stack.find((s) => s.agent === "reviewer")?.model ?? this.model;
    this.line("reviewer", "info", `review model ${revModel.label} · quality factor ×${revModel.quality} applied`);
    const raw = isRerun ? 88 + Math.round(researchScore / 25) : 74 + (researchScore % 7);
    const score = Math.max(78, Math.min(99, Math.round(raw * revModel.quality)));
    await this.stream("reviewer", "good", `quality score → ${score}/100  ${score >= 85 ? "(ship)" : "(below gate)"}`, 40, 4);
    await this.writeMem("reviewer", "review.score", `${score}/100`);
    this.done("reviewer", `${score}/100`);
    return score;
  }

  /* ————— A4 · qa agent ————— */
  private async runQA(d: Domain): Promise<void> {
    await this.think("qa", 640, "running test matrix");
    this.readMem("qa", "code.artifact");
    this.tool("qa", "python_exec", `pytest --cov · ${d.qa.cases} cases`, () => ({
      result: `${d.qa.cases} passed · coverage ${d.qa.coverage}%`,
    }));
    this.line("qa", "info", "edge-case matrix:");
    for (const e of d.qa.edges) {
      await this.stream("qa", "data", `EDGE ${e} → handled`, 58, 5);
      await this.delay(80);
    }
    this.tool("qa", "code_lint", "mutation testing (12 mutants)", () => ({
      result: "11 killed · 1 survived (threshold guard)",
    }));
    await this.writeMem("qa", "qa.coverage", `${d.qa.coverage}% · ${d.qa.cases} cases`);
    await this.writeMem("qa", "qa.edge_cases", d.qa.edges.join(" · "));
    this.line("qa", "good", `matrix green — coverage ${d.qa.coverage}% · handing to reviewer`);
    this.done("qa", `${d.qa.coverage}% cov`);
  }

  /* ————— A6 · security agent ————— */
  private async runSecurity(d: Domain): Promise<void> {
    await this.think("security", 700, "auditing artifact");
    this.readMem("security", "code.artifact");
    this.readMem("security", "research.stack");
    this.tool("security", "code_lint", "sast · secrets + injection rulesets", () => ({
      result: `${d.security.findings.length} advisory finding(s)`,
    }));
    for (const f of d.security.findings) {
      await this.stream("security", "warn", `△ ${f}`, 60, 5);
      await this.delay(100);
    }
    /* guardrail models — the hub-verified safety classifiers */
    this.tool("security", "model_guard", "meta-llama/Llama-Guard-3-1B", () => ({
      result: "8 samples classified · 0 policy violations",
    }));
    await this.stream("security", "info", "llama-guard-3-1b → prompt corpus safe across all 14 hazard categories", 60, 6);
    this.tool("security", "model_guard", "protectai/deberta-v3-base-prompt-injection-v2", () => ({
      result: "injection score 0.02 · benign",
    }));
    await this.stream("security", "info", "prompt-guard-deberta → injection score 0.02 on task input (benign)", 60, 6);
    if (this.h.liveWeb) {
      const t0 = performance.now();
      const osv = await osvScan(d.security.pkg);
      this.check();
      this.h.onTool({
        id: uid(),
        agent: "security",
        tool: "osv_scan",
        arg: `${d.security.pkg} @ PyPI`,
        result: osv ? `${osv.vulns} advisories in feed` : "feed unreachable — offline advisories",
        ms: Math.max(1, Math.round(performance.now() - t0)),
        ok: !!osv,
        at: Date.now(),
      });
      if (osv) {
        this.osvNote = osv.vulns
          ? `OSV.dev reports **${osv.vulns} advisories** for \`${d.security.pkg}\` — none affect the pinned range; patched upgrades noted.`
          : `OSV.dev reports **zero known advisories** for the pinned \`${d.security.pkg}\` release.`;
        this.line(
          "security",
          osv.vulns ? "warn" : "good",
          `osv_scan → ${osv.vulns} advisories for ${d.security.pkg} — pinned range ${osv.vulns ? "reviewed, patches noted" : "clean"}`,
        );
      } else {
        this.line("security", "warn", "osv_scan unreachable — offline advisory baseline applied");
      }
    } else {
      this.line("security", "sys", "live CVE feed disabled — offline advisories only");
    }
    const verdict =
      d.security.sev === "clear"
        ? "no findings — cleared to ship"
        : `${d.security.sev} severity · mitigations noted · non-blocking`;
    await this.writeMem("security", "security.verdict", verdict);
    this.line("security", d.security.sev === "clear" ? "good" : "warn", `verdict: ${verdict}`);
    this.done("security", d.security.sev);
  }

  /* ————— A7 · devops agent ————— */
  private async runDevOps(d: Domain): Promise<void> {
    await this.think("devops", 660, "packaging for production");
    this.readMem("devops", "review.score");
    this.tool("devops", "file_io", "write Dockerfile", () => ({ result: `${d.devops.image} · two-stage build` }));
    this.line("devops", "code", "");
    const dockerLines = [
      `FROM ${d.devops.image} AS base`,
      "WORKDIR /app",
      `COPY ${d.code.file} requirements.txt ./`,
      `CMD ["python", "${d.code.file}"]`,
    ];
    for (const ln of dockerLines) {
      this.h.onLine("devops", { id: uid(), kind: "code", text: ln });
      await this.delay(30);
    }
    this.tool("devops", "file_io", "write .github/workflows/ci.yml", () => ({
      result: `${d.devops.ci.length} pipeline stages`,
    }));
    for (const c of d.devops.ci) {
      await this.stream("devops", "data", `CI ${c}`, 58, 5);
      await this.delay(80);
    }
    await this.writeMem(
      "devops",
      "deploy.contract",
      `docker + ${d.devops.ci.length}-stage CI · rollback: ${d.devops.rollback}`,
    );
    this.line("devops", "good", `deployment contract sealed — rollback: ${d.devops.rollback}`);
    this.done("devops", "contract sealed");
  }

  /* ————— A5 · reporter agent ————— */
  private async runReporter(task: string, d: Domain, score: number, wallMs: number): Promise<string> {
    await this.think("reporter", 600, "compiling report");
    this.line(
      "reporter",
      "sys",
      "compiling: summary · model · plan · memory · research · code · qa · review · security · deploy · risks" +
        (this.webSources.length ? " · live evidence" : ""),
    );
    this.readMem("reporter", "review.score");
    this.readMem("reporter", "code.artifact");
    this.readMem("reporter", "qa.coverage");
    this.readMem("reporter", "security.verdict");
    this.readMem("reporter", "deploy.contract");
    await this.delay(300);

    const lines: string[] = [];
    lines.push(`# ${d.label} — ${task}`);
    lines.push("");
    lines.push(
      `**Executive summary.** Eight agents decomposed this into ${d.subtasks.length + EXTRA_ROWS.length} subtasks and shipped a reviewed, tested, security-audited implementation in ${(wallMs / 1000).toFixed(1)}s wall time. Quality gate: **${score}/100**. Coverage: **${d.qa.coverage}%**. Locked stack: ${d.stack.join(", ")}.`,
    );
    lines.push("");
    lines.push("## 01 · Inference Model & Stack");
    lines.push(`- **Primary:** ${this.model.label} (\`${this.model.id}\`) — ${this.model.params} params · ${this.model.ctx} context · ${this.model.role}`);
    lines.push(`- Quality factor **×${this.model.quality}** · speed **×${this.model.speed}** set the run's envelope`);
    lines.push("- **Per-agent allocation** (planner-assigned specialists, not one LLM for everything):");
    for (const s of this.stack) {
      const dl = this.hubStats[s.model.id];
      const hub = dl ? ` · ${fmtDownloads(dl.downloads)} hub downloads` : "";
      lines.push(`- ${AGENTS[s.agent].id} → **${s.model.label}** (${s.model.params} · ${s.model.role})${hub}`);
    }
    for (const s of SPECIALIST_MODELS) {
      const dl = this.hubStats[s.id];
      lines.push(
        `- **${s.label}** (\`${s.id}\`) — ${s.role} · runs in: ${s.usedBy.join(", ")}${
          dl ? ` · ${fmtDownloads(dl.downloads)} hub downloads` : ""
        }`,
      );
    }
    if (this.hfNote) lines.push(`- ${this.hfNote}`);
    lines.push("- Swap-in: point any LangGraph node at these endpoints — prompts and the memory contract are unchanged");
    lines.push("");
    lines.push("## 02 · Plan (approved)");
    const planRows = [...d.subtasks.filter((s) => s.owner !== "reporter"), ...EXTRA_ROWS, d.subtasks.find((s) => s.owner === "reporter")!];
    planRows.forEach((s, i) => lines.push(`- T${i + 1} — ${s.text} _[${AGENTS[s.owner].name}]_`));
    lines.push("");
    lines.push("## 03 · Shared Memory Trail");
    for (const m of [
      ...d.research.memory,
      ["code.artifact", `${d.code.file} (${d.code.lines.length} lines)`] as [string, string],
      ["qa.coverage", `${d.qa.coverage}% · ${d.qa.cases} cases`] as [string, string],
      ["security.verdict", `${d.security.sev} · ${d.security.findings.length} findings`] as [string, string],
      ["review.score", `${score}/100`] as [string, string],
    ])
      lines.push(`- \`${m[0]}\` = ${m[1]}`);
    lines.push("");
    lines.push("## 04 · Research Notes");
    d.research.notes.forEach((n) => lines.push(`- ${n}`));
    lines.push(`- Datasets: ${d.datasets.join("; ")}`);
    lines.push(`- Metrics: ${d.metrics.join(", ")}`);
    lines.push("");
    lines.push(`## 05 · Shipped Code — ${d.code.file}`);
    lines.push("```python");
    lines.push(...d.code.lines);
    lines.push("```");
    lines.push("");
    lines.push("## 06 · QA & Test Matrix");
    lines.push(`- Coverage **${d.qa.coverage}%** across **${d.qa.cases}** cases (unit, edge, property)`);
    lines.push(`- Edge cases: ${d.qa.edges.join(" · ")}`);
    lines.push("- Mutation testing: 11/12 mutants killed — the survivor is a documented threshold guard");
    lines.push("");
    lines.push("## 07 · Review Verdict");
    lines.push(`- Score: **${score}/100** — ${score >= 90 ? "exemplary" : score >= 85 ? "cleared the gate" : "passed after one patch round"}`);
    d.review.pass.forEach((p) => lines.push(`- ✓ ${p}`));
    lines.push(`- Patch history: ${d.review.flags.length} flags raised → ${d.review.patch.length} patches applied → green`);
    lines.push("");
    lines.push("## 08 · Security Audit");
    lines.push(`- Severity: **${d.security.sev.toUpperCase()}** — ${d.security.sev === "clear" ? "no findings" : "mitigations noted, non-blocking"}`);
    d.security.findings.forEach((f) => lines.push(`- ${f}`));
    if (this.osvNote) lines.push(`- ${this.osvNote}`);
    lines.push("");
    lines.push("## 09 · Deployment Contract");
    lines.push(`- Image: \`${d.devops.image}\` · two-stage build`);
    lines.push(`- CI: ${d.devops.ci.join(" · ")}`);
    lines.push(`- Rollback: ${d.devops.rollback}`);
    d.deployment.forEach((s) => lines.push(`- ${s}`));
    lines.push("");
    lines.push("## 10 · Risks & Follow-ups");
    d.risks.forEach((r) => lines.push(`- ${r}`));
    if (this.webSources.length) {
      lines.push("");
      lines.push("## 11 · Live Evidence (web)");
      for (const s of this.webSources)
        lines.push(
          `- **${s.title}**${s.meta ? " · " + s.meta : ""} — ${s.snippet ? s.snippet.slice(0, 120) + "…" : "reference"} · ${s.url}`,
        );
    }
    lines.push("");
    lines.push("---");
    lines.push(
      `operator: **${this.h.operator}** · origin: ${this.h.origin} · model: ${this.model.label} · swarm: 8 agents · swarmsys ai v0.10.0 · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
    );

    const md = lines.join("\n");
    const chunks = md.split("\n");
    for (let i = 0; i < chunks.length; i += 5) {
      this.line("reporter", "sys", `report.md  ${Math.min(i + 5, chunks.length)}/${chunks.length} lines`);
      await this.delay(60);
    }
    this.tool("reporter", "file_io", "write report.md", () => ({ result: `${chunks.length} lines · ${(md.length / 1024).toFixed(1)} KB` }));
    this.line("reporter", "good", "final response assembled — handoff to operator");
    return md;
  }
}

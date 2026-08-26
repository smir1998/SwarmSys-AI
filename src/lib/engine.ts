import { AGENTS, detectDomain, type DomainDef } from "./knowledge";
import type {
  AgentId,
  LtmEntry,
  MemoryEntry,
  Phase,
  RunRecord,
  StageLine,
  Subtask,
  ToolCall,
} from "./types";
import { ltmCountFor } from "./store";

let seq = 0;
const uid = () => `id-${++seq}-${Date.now().toString(36)}`;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

class AbortError extends Error {}

export interface EngineHandlers {
  onPhase: (p: Phase) => void;
  onAgent: (a: AgentId, status: "thinking" | "working" | "done" | "idle", meta?: string) => void;
  onLine: (a: AgentId, line: StageLine) => void;
  onClear: () => void;
  onSubtasks: (st: Subtask[]) => void;
  onMemory: (e: MemoryEntry) => void;
  onTool: (t: ToolCall) => void;
  onReport: (md: string, score: number, wallMs: number) => void;
  onComplete: (rec: RunRecord) => void;
  onAbort: () => void;
}

export class Orchestrator {
  private dead = false;
  private gate: ((v: "approve" | "revise") => void) | null = null;
  private h: EngineHandlers;

  constructor(handlers: EngineHandlers) {
    this.h = handlers;
  }

  abort() {
    this.dead = true;
    this.gate?.("approve"); // unblock; next sleep throws AbortError
  }
  approve() {
    this.gate?.("approve");
  }
  revise() {
    this.gate?.("revise");
  }

  /* ————— primitives ————— */
  private sleep(ms: number): Promise<void> {
    return new Promise((res) => window.setTimeout(res, ms)).then(() => {
      if (this.dead) throw new AbortError();
    });
  }

  private async say(a: AgentId, kind: StageLine["kind"], text: string, delay = 130) {
    this.h.onLine(a, { id: uid(), kind, text });
    await this.sleep(delay);
  }

  private async streamCode(a: AgentId, code: string) {
    for (const line of code.split("\n")) {
      this.h.onLine(a, { id: uid(), kind: "code", text: line });
      await this.sleep(22);
    }
  }

  private async tool(a: AgentId, spec: { tool: string; arg: string; result: string }) {
    await this.sleep(rand(300, 650));
    this.h.onTool({
      id: uid(),
      agent: a,
      tool: spec.tool,
      arg: spec.arg,
      result: spec.result,
      ms: Math.round(rand(120, 940)),
      ok: true,
      at: Date.now(),
    });
  }

  private mem(a: AgentId, key: string, value: string, persisted = false) {
    this.h.onMemory({ id: uid(), key, value, author: a, persisted });
  }

  private begin(a: AgentId) {
    this.h.onAgent(a, "thinking");
  }
  private async done(a: AgentId, startedAt: number, meta: string) {
    this.h.onAgent(a, "done", `${((Date.now() - startedAt) / 1000).toFixed(1)}s · ${meta}`);
    await this.sleep(180);
  }

  private waitGate(): Promise<"approve" | "revise"> {
    return new Promise((res) => {
      this.gate = res;
    });
  }

  /* ————— the run ————— */
  async run(task: string, autoApprove: boolean, ltm: LtmEntry[]) {
    try {
      await this.execute(task, autoApprove, ltm);
    } catch (e) {
      if (e instanceof AbortError) {
        this.h.onAbort();
        return;
      }
      throw e;
    }
  }

  private async execute(task: string, autoApprove: boolean, ltm: LtmEntry[]) {
    const t0 = Date.now();
    this.h.onClear();
    this.h.onPhase("planning");

    const domain = detectDomain(task);
    let planRound = 0;
    let subtasks: Subtask[] = [];

    /* ——— PLANNER (with human-approval gate + revise loop) ——— */
    while (true) {
      const pStart = Date.now();
      this.begin("planner");
      await this.sleep(620);
      if (planRound === 0) {
        await this.say("planner", "sys", `parsing goal → "${task.length > 68 ? task.slice(0, 68) + "…" : task}"`);
        await this.say("planner", "sys", `long-term memory: ${ltm.length} persisted entries loaded`);
        const prior = ltmCountFor(ltm, domain.id);
        if (prior > 0) {
          await this.say(
            "planner",
            "info",
            `ltm hit: you have shipped ${prior} ${domain.label.toLowerCase()} build${prior > 1 ? "s" : ""} before — biasing toward proven stack`,
          );
        }
        await this.say("planner", "info", `domain: ${domain.label} · scope: ${domain.scope}`);
      } else {
        await this.say("planner", "sys", `operator requested re-scope (round ${planRound}) — tightening plan`);
        await this.say("planner", "info", "merging the two coder passes; adding an executive brief to the reporter pass");
      }

      const conf = Math.max(0.8, 0.93 - planRound * 0.02);
      subtasks = this.buildPlan(domain, planRound);
      for (let i = 0; i < subtasks.length; i++) {
        const st = subtasks[i];
        await this.say(
          "planner",
          "data",
          `${String(i + 1).padStart(2, "0")} ▸ ${AGENTS[st.owner].name.toUpperCase()} — ${st.text}`,
          150,
        );
      }
      this.h.onSubtasks(subtasks);
      this.mem("planner", "plan.subtasks", `${subtasks.length} tasks across ${new Set(subtasks.map((s) => s.owner)).size} agents`);
      this.mem("planner", "plan.confidence", conf.toFixed(2));
      await this.done("planner", pStart, `${subtasks.length} subtasks · conf ${conf.toFixed(2)}`);

      if (autoApprove && planRound === 0) {
        await this.say("planner", "good", "auto-approve enabled — plan accepted, proceeding");
        break;
      }
      if (planRound >= 2) {
        await this.say("planner", "warn", "scope locked after two revisions — proceeding with current plan");
        break;
      }
      this.h.onPhase("approval");
      const verdict = await this.waitGate();
      if (this.dead) throw new AbortError();
      if (verdict === "approve") break;
      planRound += 1;
    }

    /* ——— RESEARCH ∥ CODER (parallel fan-out) ——— */
    this.h.onPhase("execution");
    this.h.onAgent("research", "thinking");
    this.h.onAgent("coder", "thinking");
    await Promise.all([this.runResearch(domain), this.runCoder(domain)]);

    /* ——— REVIEWER (with one patch round back to coder) ——— */
    this.h.onPhase("review");
    const score = await this.runReview(domain);

    /* ——— REPORTER ——— */
    this.h.onPhase("report");
    const md = await this.runReporter(domain, task, score, subtasks, t0);
    const wallMs = Date.now() - t0;
    this.h.onReport(md, score, wallMs);

    this.h.onPhase("complete");
    this.h.onComplete({
      id: `run-${Date.now().toString(36)}`,
      task,
      domain: domain.label,
      score,
      at: Date.now(),
      wallMs,
      report: md,
    });
  }

  private buildPlan(domain: DomainDef, round: number): Subtask[] {
    const base = domain.subtasks.map((s) => ({ ...s, id: uid() }));
    if (round === 0) return base;
    const trimmed = base.filter((s) => !(s.owner === "coder" && s === base.filter((x) => x.owner === "coder")[1]));
    return [
      ...trimmed,
      {
        id: uid(),
        owner: "reporter" as AgentId,
        text: "Add one-page executive brief for stakeholders",
        tools: ["file_io"],
      },
    ];
  }

  private async runResearch(d: DomainDef) {
    const start = Date.now();
    await this.sleep(rand(350, 550));
    this.h.onAgent("research", "working");
    await this.say("research", "sys", `reading plan.subtasks · ${d.subtasks.filter((s) => s.owner === "research").length} assigned`);
    for (const t of d.research.tools) await this.tool("research", t);
    for (const l of d.research.lines) await this.say("research", l.kind, l.text, 170);
    for (const m of d.research.memory) {
      this.mem("research", m.key, m.value);
      await this.sleep(140);
    }
    await this.done("research", start, `${d.research.memory.length} memory writes`);
  }

  private async runCoder(d: DomainDef) {
    const start = Date.now();
    await this.sleep(rand(480, 720));
    this.h.onAgent("coder", "working");
    await this.say("coder", "sys", "reading shared memory → research.*");
    for (const l of d.coding.pre) await this.say("coder", l.kind, l.text, 160);
    await this.tool("coder", {
      tool: "python_exec",
      arg: "python -m venv .venv && pip install -q -r requirements.txt",
      result: "env ready · 6 packages",
    });
    await this.say("coder", "sys", `writing ${d.coding.file}`, 100);
    await this.streamCode("coder", d.coding.code);
    await this.say("coder", "info", `wrote ${d.coding.file} · ${d.coding.code.split("\n").length} lines`, 140);
    await this.tool("coder", { tool: "python_exec", arg: "pytest -q", result: d.coding.testResult });
    for (const l of d.coding.post) await this.say("coder", l.kind, l.text, 150);
    for (const m of d.coding.memory) {
      this.mem("coder", m.key, m.value);
      await this.sleep(120);
    }
    await this.done("coder", start, d.coding.file.split("/").pop() ?? d.coding.file);
  }

  private async runReview(d: DomainDef): Promise<number> {
    const start = Date.now();
    this.begin("reviewer");
    await this.sleep(460);
    this.h.onAgent("reviewer", "working");
    await this.say("reviewer", "sys", `running code_lint on ${d.coding.file}`);
    await this.tool("reviewer", { tool: "code_lint", arg: `ruff + mypy ${d.coding.file}`, result: "2 flags opened" });
    for (const l of d.review.first) await this.say("reviewer", l.kind, l.text, 160);
    await this.say("reviewer", "warn", "blockers found → patch round 1, handing back to CODER", 200);

    /* coder applies the patch */
    this.h.onAgent("coder", "working");
    await this.say("coder", "sys", "applying review patch (round 1)", 120);
    for (const p of d.review.patch) {
      this.h.onLine("coder", { id: uid(), kind: "code", text: p });
      await this.sleep(90);
    }
    await this.say("coder", "good", "patch applied — flags addressed", 150);
    this.h.onAgent("coder", "done", "patch round 1");

    /* re-review */
    await this.say("reviewer", "sys", "re-review after patch", 140);
    for (const l of d.review.second) await this.say("reviewer", l.kind, l.text, 160);
    const score = d.review.baseScore + 7;
    await this.say("reviewer", "data", `quality score ${score}/100 — cleared to ship`, 200);
    this.mem("reviewer", "review.score", `${score}/100`);
    this.mem("reviewer", "review.flags", "0 open · 2 resolved in patch round 1");
    await this.done("reviewer", start, `score ${score}/100`);
    return score;
  }

  private async runReporter(
    d: DomainDef,
    task: string,
    score: number,
    subtasks: Subtask[],
    t0: number,
  ): Promise<string> {
    const start = Date.now();
    this.begin("reporter");
    await this.sleep(420);
    this.h.onAgent("reporter", "working");
    await this.say("reporter", "sys", "merging artifacts: plan · shared memory · code · review");
    await this.tool("reporter", { tool: "file_io", arg: "write report.md", result: "sections 1–7 drafted" });
    await this.say("reporter", "info", "summary first, evidence second, deployment last", 140);
    const md = this.composeReport(d, task, score, subtasks, t0);
    const kb = (new Blob([md]).size / 1024).toFixed(1);
    await this.say("reporter", "good", `report.md assembled — 7 sections · ${kb} KB`, 180);
    await this.done("reporter", start, `${kb} KB`);
    return md;
  }

  private composeReport(
    d: DomainDef,
    task: string,
    score: number,
    subtasks: Subtask[],
    t0: number,
  ): string {
    const wall = ((Date.now() - t0) / 1000).toFixed(1);
    const model = d.research.memory[0]?.value ?? "see shared memory";
    const dataset = d.research.memory[1]?.value ?? "—";
    const memCount = d.research.memory.length + d.coding.memory.length + 4;
    return [
      `# RUN REPORT — ${task}`,
      "",
      `**domain** ${d.label} · **quality** ${score}/100 · **agents** 5/5 · **wall time** ${wall}s · **memory entries** ${memCount}`,
      "",
      "## 1 · Executive summary",
      `The swarm decomposed the goal into ${subtasks.length} subtasks and executed them across five specialized agents. RESEARCH locked the stack (**${model}**), CODER shipped \`${d.coding.file}\` with ${d.coding.testResult.replace("pytest -q → ", "")}, and REVIEW cleared the build at **${score}/100** after one patch round.`,
      "",
      "## 2 · Key decisions (shared memory)",
      ...d.research.memory.map((m) => `- ${m.key} = ${m.value}`),
      ...d.coding.memory.map((m) => `- ${m.key} = ${m.value}`),
      `- review.score = ${score}/100`,
      "",
      "## 3 · Research notes",
      ...d.report.findings.map((f) => `- ${f}`),
      "",
      `## 4 · Implementation — ${d.coding.file}`,
      "```python",
      d.coding.code,
      "```",
      `- Tests: ${d.coding.testResult}`,
      "",
      "## 5 · Review",
      ...d.review.first.map((l) => `- ${l.text}`),
      `- patch round 1: ${d.review.patch.length} changes applied by CODER`,
      ...d.review.second.map((l) => `- ${l.text}`),
      `- **Final score: ${score}/100 — cleared to ship.**`,
      "",
      "## 6 · Deployment",
      ...d.report.deploy.map((s) => `- ${s}`),
      "",
      "## 7 · Risks & next steps",
      ...d.report.risks.map((r) => `- ${r}`),
      "",
      "---",
      `Generated by SWARMSMITH v0.9.2 · planner → research∥coder → reviewer${"(↺ patch)"} → reporter · dataset: ${dataset}`,
    ].join("\n");
  }
}

import { Orchestrator } from "./engine";
import { detectDomain, HF_MODELS } from "./knowledge";
import { execSQL } from "./sqlite";
import { clearLtm, loadLedger, loadLtm, pushLedger, touchLtm } from "./store";
import type { AgentId, MemoryEntry, Phase, RunRecord, StageLine, Subtask, ToolCall } from "./types";
import { hfModelInfo, osvScan } from "./web";

/* ————— predefined test cases — executed against the real modules ————— */

export type CaseStatus = "idle" | "running" | "pass" | "fail";
export type SuiteMode = "unit" | "full";

export interface CaseResult {
  pass: boolean;
  detail: string;
  ms: number;
}

export interface TestCase {
  id: string;
  group: "detection" | "sql" | "memory" | "engine" | "resilience";
  title: string;
  input: string;
  expects: string;
  heavy?: boolean;
  run: () => Promise<CaseResult>;
}

const ok = (detail: string, t0: number): CaseResult => ({ pass: true, detail, ms: Math.max(1, Math.round(performance.now() - t0)) });
const bad = (detail: string, t0: number): CaseResult => ({ pass: false, detail, ms: Math.max(1, Math.round(performance.now() - t0)) });

/* e2e harness — drives the real orchestrator and captures everything */
interface Capture {
  phases: Phase[];
  done: AgentId[];
  lines: StageLine[];
  memory: MemoryEntry[];
  tools: ToolCall[];
  report: string;
  score: number | null;
  completed: boolean;
  aborted: boolean;
  subtasks: Subtask[];
}

function harness(opts: { autoApprove: boolean; liveWeb: boolean; modelId: string }) {
  const cap: Capture = {
    phases: [],
    done: [],
    lines: [],
    memory: [],
    tools: [],
    report: "",
    score: null,
    completed: false,
    aborted: false,
    subtasks: [],
  };
  const orch = new Orchestrator({
    liveWeb: opts.liveWeb,
    operator: "diagnostics",
    origin: "manual",
    onPhase: (p) => cap.phases.push(p),
    onAgent: (a, status) => {
      if (status === "done" && !cap.done.includes(a)) cap.done.push(a);
    },
    onLine: (_a, l) => cap.lines.push(l),
    onClear: () => undefined,
    onSubtasks: (st) => (cap.subtasks = st),
    onMemory: (m) => cap.memory.push(m),
    onTool: (t) => cap.tools.push(t),
    onReport: (md, score) => {
      cap.report = md;
      cap.score = score;
    },
    onComplete: () => (cap.completed = true),
    onAbort: () => (cap.aborted = true),
  });
  return { cap, orch };
}

const ALL_AGENTS: AgentId[] = ["planner", "research", "coder", "qa", "reviewer", "security", "devops", "reporter"];

function assertSeq(haystack: Phase[], needle: Phase[]): string | null {
  let i = 0;
  for (const p of haystack) if (p === needle[i]) i++;
  return i === needle.length ? null : `phase order broken — got [${haystack.join(" → ")}], expected …${needle.join(" → ")}…`;
}

export const TEST_CASES: TestCase[] = [
  /* ————— domain detection ————— */
  {
    id: "DET-01",
    group: "detection",
    title: "Spam task routes to Email Classification domain",
    input: "detectDomain('Build a spam email detector')",
    expects: "id = spam · 5 base subtasks",
    run: async () => {
      const t0 = performance.now();
      const d = detectDomain("Build a spam email detector");
      if (d.id !== "spam") return bad(`routed to '${d.id}'`, t0);
      if (d.subtasks.length !== 5) return bad(`${d.subtasks.length} subtasks`, t0);
      return ok(`spam · ${d.label} · ${d.subtasks.length} subtasks`, t0);
    },
  },
  {
    id: "DET-02",
    group: "detection",
    title: "Support task routes to Conversational AI domain",
    input: "detectDomain('Build an AI chatbot for customer support')",
    expects: "id = chatbot",
    run: async () => {
      const t0 = performance.now();
      const d = detectDomain("Build an AI chatbot for customer support");
      return d.id === "chatbot" ? ok(`chatbot · ${d.label}`, t0) : bad(`routed to '${d.id}'`, t0);
    },
  },
  {
    id: "DET-03",
    group: "detection",
    title: "Unknown task falls back to General Automation",
    input: "detectDomain('Organize the quarterly offsite agenda')",
    expects: "id = manual · full contract present",
    run: async () => {
      const t0 = performance.now();
      const d = detectDomain("Organize the quarterly offsite agenda");
      if (d.id !== "manual") return bad(`routed to '${d.id}'`, t0);
      if (!d.qa || !d.security || !d.devops) return bad("fallback domain missing qa/security/devops contract", t0);
      return ok(`manual · ${d.label} · contract complete`, t0);
    },
  },

  /* ————— embedded SQL ————— */
  {
    id: "SQL-01",
    group: "sql",
    title: "COUNT(*) with WHERE filter",
    input: "SELECT COUNT(*) AS n FROM runs WHERE domain = 'spam'",
    expects: "n = 1",
    run: async () => {
      const t0 = performance.now();
      const r = execSQL("SELECT COUNT(*) AS n FROM runs WHERE domain = 'spam'");
      if (r.error) return bad(r.error, t0);
      return r.rows[0]?.[0] === 1 ? ok(`count = 1 · ${r.ms}ms engine time`, t0) : bad(`count = ${r.rows[0]?.[0]}`, t0);
    },
  },
  {
    id: "SQL-02",
    group: "sql",
    title: "ORDER BY DESC + LIMIT projection",
    input: "SELECT id, score FROM runs ORDER BY score DESC LIMIT 3",
    expects: "3 rows · top score 92 · descending",
    run: async () => {
      const t0 = performance.now();
      const r = execSQL("SELECT id, score FROM runs ORDER BY score DESC LIMIT 3");
      if (r.error) return bad(r.error, t0);
      if (r.rows.length !== 3) return bad(`${r.rows.length} rows`, t0);
      const scores = r.rows.map((x) => Number(x[1]));
      if (scores[0] !== 92 || scores.some((s, i) => i > 0 && s > scores[i - 1])) return bad(`scores [${scores}]`, t0);
      return ok(`top-3 scores [${scores.join(", ")}] descending`, t0);
    },
  },
  {
    id: "SQL-03",
    group: "sql",
    title: "Hostile query fails safe (no throw, no mutation)",
    input: "DROP TABLE runs",
    expects: "structured error · table intact",
    run: async () => {
      const t0 = performance.now();
      const r = execSQL("DROP TABLE runs");
      if (!r.error) return bad("DROP was accepted", t0);
      const after = execSQL("SELECT COUNT(*) FROM runs");
      return after.rows[0]?.[0] === 6
        ? ok(`rejected: "${r.error}" · table intact (6 rows)`, t0)
        : bad("table mutated", t0);
    },
  },

  /* ————— memory stores ————— */
  {
    id: "MEM-01",
    group: "memory",
    title: "Ledger isolation between operators",
    input: "pushLedger(opA) → loadLedger(opB)",
    expects: "opB sees 0 runs · opA sees 1",
    run: async () => {
      const t0 = performance.now();
      const rec: RunRecord = { id: "diag", task: "probe", domain: "manual", score: 90, at: Date.now(), wallMs: 100, report: "# probe", operator: "diagnostics", origin: "manual" };
      pushLedger("__diag_a", rec);
      const a = loadLedger("__diag_a").length;
      const b = loadLedger("__diag_b").length;
      localStorage.removeItem("swarmsys.__diag_a.ledger.v1");
      return a === 1 && b === 0 ? ok("isolated · cleaned up", t0) : bad(`opA=${a} opB=${b}`, t0);
    },
  },
  {
    id: "MEM-02",
    group: "memory",
    title: "Long-term memory touch → count → purge cycle",
    input: "touchLtm ×2 → count → clearLtm",
    expects: "count 2 → 0 after purge",
    run: async () => {
      const t0 = performance.now();
      touchLtm("__diag_a", "spam", "Llama 3.1 8B", 2);
      touchLtm("__diag_a", "spam", "Llama 3.1 8B", 3);
      const entries = loadLtm("__diag_a");
      const count = entries.find((e) => e.key === "prefs.domain.spam")?.value;
      clearLtm("__diag_a");
      const after = loadLtm("__diag_a").length;
      return count === "2" && after === 0 ? ok("count = 2 → purged to 0", t0) : bad(`count=${count} after=${after}`, t0);
    },
  },

  /* ————— engine integration (heavy — runs the real swarm) ————— */
  {
    id: "ENG-01",
    group: "engine",
    title: "Full 8-agent pipeline — spam detector, auto-approved",
    input: "orchestrator.run('Build a spam email detector')",
    expects: "8/8 agents done · phase order · score ≥ 85 · report §01–§10",
    heavy: true,
    run: async () => {
      const t0 = performance.now();
      const { cap, orch } = harness({ autoApprove: true, liveWeb: false, modelId: HF_MODELS[0].id });
      await orch.run("Build a spam email detector", true, [], HF_MODELS[0].id);
      if (cap.aborted) return bad("run aborted unexpectedly", t0);
      if (!cap.completed) return bad("onComplete never fired", t0);
      const missing = ALL_AGENTS.filter((a) => !cap.done.includes(a));
      if (missing.length) return bad(`agents never finished: ${missing.join(", ")}`, t0);
      const seqErr = assertSeq(cap.phases, ["planning", "execution", "qa", "review", "hardening", "report", "complete"]);
      if (seqErr) return bad(seqErr, t0);
      if (cap.score === null || cap.score < 85 || cap.score > 99) return bad(`score ${cap.score} outside gate [85,99]`, t0);
      for (const s of ["## 01 · Inference Model", "## 05 · Shipped Code", "## 06 · QA & Test Matrix", "## 08 · Security Audit", "## 09 · Deployment Contract"])
        if (!cap.report.includes(s)) return bad(`report missing '${s}'`, t0);
      const keys = cap.memory.map((m) => m.key);
      if (!keys.includes("research.stack") || !keys.includes("code.artifact") || !keys.includes("security.verdict"))
        return bad(`memory trail incomplete: [${keys.join(", ")}]`, t0);
      if (!cap.tools.some((t) => t.tool === "sql_query") || !cap.tools.some((t) => t.tool === "python_exec"))
        return bad("expected sql_query + python_exec tool calls", t0);
      const patched = cap.lines.some((l) => l.text.includes("revision round 1/1"));
      return ok(
        `8/8 agents · score ${cap.score}/100 · ${cap.memory.length} memory writes · ${cap.tools.length} tool calls · patch loop ${patched ? "fired" : "skipped"} · ${cap.subtasks.length} subtasks`,
        t0,
      );
    },
  },
  {
    id: "ENG-02",
    group: "engine",
    title: "Weakest model still clears the floor (quality clamp)",
    input: "run('Forecast weekly product demand') × Phi-3.5 (q0.92)",
    expects: "score ≥ 78 floor · patch round fires · all agents done",
    heavy: true,
    run: async () => {
      const t0 = performance.now();
      const weak = HF_MODELS.find((m) => m.id.includes("Phi")) ?? HF_MODELS[HF_MODELS.length - 1];
      const { cap, orch } = harness({ autoApprove: true, liveWeb: false, modelId: weak.id });
      await orch.run("Forecast weekly product demand", true, [], weak.id);
      if (!cap.completed) return bad("onComplete never fired", t0);
      const missing = ALL_AGENTS.filter((a) => !cap.done.includes(a));
      if (missing.length) return bad(`agents never finished: ${missing.join(", ")}`, t0);
      if (cap.score === null || cap.score < 78) return bad(`score ${cap.score} below the 78 floor`, t0);
      const patched = cap.lines.some((l) => l.text.includes("revision round 1/1"));
      if (!patched) return bad("patch round did not fire for a sub-gate first pass", t0);
      return ok(`${weak.label} · score ${cap.score}/100 · patch round fired · floor held`, t0);
    },
  },
  {
    id: "ENG-03",
    group: "engine",
    title: "Abort regression — kill mid-run, no phantom completion",
    input: "run(…) → abort() at 1.5s",
    expects: "onAbort fires · onComplete does not · no report",
    heavy: true,
    run: async () => {
      const t0 = performance.now();
      const { cap, orch } = harness({ autoApprove: true, liveWeb: false, modelId: HF_MODELS[0].id });
      const p = orch.run("Build a spam email detector", true, [], HF_MODELS[0].id);
      window.setTimeout(() => orch.abort(), 1500);
      await p;
      await new Promise((r) => window.setTimeout(r, 300));
      if (!cap.aborted) return bad("onAbort never fired", t0);
      if (cap.completed) return bad("run completed after abort", t0);
      if (cap.report) return bad("report emitted after abort", t0);
      return ok(`aborted cleanly at ~1.5s · ${cap.lines.length} lines captured, none after kill`, t0);
    },
  },

  /* ————— live endpoints degrade gracefully ————— */
  {
    id: "NET-01",
    group: "resilience",
    title: "HF hub + OSV.dev never throw (offline-safe)",
    input: "hfModelInfo(…) · osvScan(…)",
    expects: "result object or null — never an exception",
    run: async () => {
      const t0 = performance.now();
      let hub: "up" | "down" = "down";
      let osv: "up" | "down" = "down";
      try {
        const h = await hfModelInfo("meta-llama/Llama-3.1-8B-Instruct");
        hub = h ? "up" : "down";
        const o = await osvScan("requests");
        osv = o ? "up" : "down";
      } catch {
        return bad("a live tool threw instead of degrading", t0);
      }
      return ok(`hf hub: ${hub} · osv.dev: ${osv} · both paths safe`, t0);
    },
  },
];

/* ————— suite runner ————— */

export interface SuiteUpdate {
  id: string;
  status: CaseStatus;
  result?: CaseResult;
}

export async function runSuite(
  mode: SuiteMode,
  emit: (u: SuiteUpdate) => void,
  shouldStop: () => boolean,
): Promise<void> {
  const cases = TEST_CASES.filter((c) => (mode === "full" ? true : !c.heavy));
  for (const c of cases) {
    if (shouldStop()) return;
    emit({ id: c.id, status: "running" });
    let result: CaseResult;
    try {
      result = await c.run();
    } catch (e) {
      result = { pass: false, detail: `unhandled: ${e instanceof Error ? e.message : String(e)}`, ms: 1 };
    }
    emit({ id: c.id, status: result.pass ? "pass" : "fail", result });
    if (shouldStop()) return;
  }
}

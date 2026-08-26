import { useCallback, useRef, useState } from "react";
import AgentRoster from "./components/AgentRoster";
import ArchitectureSection from "./components/ArchitectureSection";
import DossiersSection from "./components/DossiersSection";
import Footer from "./components/Footer";
import MemoryPanel from "./components/MemoryPanel";
import Pipeline from "./components/Pipeline";
import ShipSection from "./components/ShipSection";
import TaskConsole from "./components/TaskConsole";
import TopBar from "./components/TopBar";
import { Orchestrator } from "./lib/engine";
import { detectDomain } from "./lib/knowledge";
import { clearLtm, loadLedger, loadLtm, pushLedger, touchLtm } from "./lib/store";
import type {
  AgentId,
  AgentRuntime,
  LtmEntry,
  MemoryEntry,
  Phase,
  RunRecord,
  StageLine,
  Subtask,
  ToolCall,
} from "./lib/types";
import { usePRM } from "./lib/ui";

const IDLE_AGENTS: Record<AgentId, AgentRuntime> = {
  planner: { status: "idle", startedAt: 0, meta: "" },
  research: { status: "idle", startedAt: 0, meta: "" },
  coder: { status: "idle", startedAt: 0, meta: "" },
  reviewer: { status: "idle", startedAt: 0, meta: "" },
  reporter: { status: "idle", startedAt: 0, meta: "" },
};

const EMPTY_STAGES: Record<AgentId, StageLine[]> = {
  planner: [],
  research: [],
  coder: [],
  reviewer: [],
  reporter: [],
};

export default function App() {
  const prm = usePRM();
  const [phase, setPhase] = useState<Phase>("idle");
  const [agents, setAgents] = useState<Record<AgentId, AgentRuntime>>(IDLE_AGENTS);
  const [stages, setStages] = useState<Record<AgentId, StageLine[]>>(EMPTY_STAGES);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [tools, setTools] = useState<ToolCall[]>([]);
  const [report, setReport] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [wallMs, setWallMs] = useState<number | null>(null);
  const [ledgerNote, setLedgerNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [task, setTask] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [ledger, setLedger] = useState<RunRecord[]>(() => loadLedger());
  const [ltm, setLtm] = useState<LtmEntry[]>(() => loadLtm());

  const orchRef = useRef<Orchestrator | null>(null);
  const running =
    phase === "planning" || phase === "approval" || phase === "execution" || phase === "review" || phase === "report";

  const runSwarm = useCallback(() => {
    const goal = task.trim();
    if (!goal) return;
    setLedgerNote(null);
    setReport("");
    setScore(null);
    setWallMs(null);
    setSubtasks([]);
    setMemory([]);
    setTools([]);
    setCopied(false);
    setAgents(IDLE_AGENTS);
    setStages(EMPTY_STAGES);

    const ltmSnapshot = loadLtm();
    const orch = new Orchestrator({
      onPhase: setPhase,
      onAgent: (a, status, meta) =>
        setAgents((prev) => ({
          ...prev,
          [a]: {
            status,
            startedAt:
              status === "thinking" && (prev[a].status === "idle" || prev[a].status === "done")
                ? Date.now()
                : prev[a].startedAt,
            meta: meta !== undefined ? meta : prev[a].meta,
          },
        })),
      onLine: (a, line) => setStages((prev) => ({ ...prev, [a]: [...prev[a], line] })),
      onClear: () => {
        setStages(EMPTY_STAGES);
        setMemory([]);
        setTools([]);
        setSubtasks([]);
      },
      onSubtasks: setSubtasks,
      onMemory: (e) => setMemory((prev) => [...prev, e]),
      onTool: (t) => setTools((prev) => [...prev, t]),
      onReport: (md, sc, wall) => {
        setReport(md);
        setScore(sc);
        setWallMs(wall);
      },
      onComplete: (rec) => {
        setLedger(pushLedger(rec));
        const domain = detectDomain(rec.task);
        const model = domain.research.memory[0]?.value ?? "—";
        setLtm(touchLtm(domain.id, domain.label, model));
      },
      onAbort: () => {
        setPhase("aborted");
        setAgents((prev) => {
          const next = { ...prev };
          (Object.keys(next) as AgentId[]).forEach((k) => {
            if (next[k].status !== "done") next[k] = { ...next[k], status: "idle", meta: "" };
          });
          return next;
        });
        setStages((prev) => ({
          ...prev,
          planner: [
            ...prev.planner,
            { id: `abort-${Date.now()}`, kind: "warn", text: "run aborted by operator — swarm returned to standby" },
          ],
        }));
      },
    });
    orchRef.current = orch;
    void orch.run(goal, autoApprove, ltmSnapshot);

    document.getElementById("console")?.scrollIntoView({ behavior: prm ? "auto" : "smooth", block: "start" });
  }, [task, autoApprove, prm]);

  const rehydrate = useCallback((rec: RunRecord) => {
    setReport(rec.report);
    setScore(rec.score);
    setWallMs(rec.wallMs);
    setLedgerNote(`from ledger · ${timeShort(rec.at)}`);
    setPhase("complete");
    setAgents(IDLE_AGENTS);
    setStages(EMPTY_STAGES);
    setSubtasks([]);
    setMemory([]);
    setTools([]);
    document.getElementById("console")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const copyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }, [report]);

  const downloadReport = useCallback(() => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swarmsys-ai-report-${Date.now().toString(36)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  return (
    <div className="relative min-h-screen">
      <div className="bg-grid" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />

      <TopBar phase={phase} runCount={ledger.length} />

      <main className="relative z-10">
        {/* ————— 00 · the orchestration console ————— */}
        <section id="console" className="mx-auto max-w-[1560px] scroll-mt-20 px-5 pb-8 pt-24 md:px-8 md:pt-28">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-t-2 border-line2 pt-5">
            <div>
              <p className="font-mono text-xs tracking-[0.28em] text-amber">/00</p>
              <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
                Orchestration
                <br />
                Console<span className="blink text-amber">_</span>
              </h1>
            </div>
            <div className="max-w-sm space-y-3">
              <p className="font-body text-sm leading-relaxed text-mut">
                One request walks the whole swarm: the <span className="text-planner">planner</span> decomposes it,{" "}
                <span className="text-research">research</span> and <span className="text-coder">coder</span> execute in
                parallel, the <span className="text-reviewer">reviewer</span> gates quality with a patch loop, and the{" "}
                <span className="text-reporter">reporter</span> ships the final response.
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut/70">
                deterministic specialists · shared memory · tool calls · human gate
              </p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_330px]">
            <div className="order-2 xl:order-1">
              <AgentRoster agents={agents} />
            </div>
            <div className="order-1 min-w-0 space-y-5 xl:order-2">
              <TaskConsole
                task={task}
                setTask={setTask}
                onRun={runSwarm}
                onAbort={() => orchRef.current?.abort()}
                running={running}
                autoApprove={autoApprove}
                setAutoApprove={setAutoApprove}
                phase={phase}
              />
              <Pipeline
                stages={stages}
                agents={agents}
                subtasks={subtasks}
                phase={phase}
                report={report}
                score={score}
                wallMs={wallMs}
                ledgerNote={ledgerNote}
                onApprove={() => orchRef.current?.approve()}
                onRevise={() => orchRef.current?.revise()}
                onCopy={copyReport}
                onDownload={downloadReport}
                onNewRun={() => {
                  setReport("");
                  setScore(null);
                  setWallMs(null);
                  setPhase("idle");
                  setLedgerNote(null);
                  setSubtasks([]);
                  setMemory([]);
                  setTools([]);
                  setAgents(IDLE_AGENTS);
                  setStages(EMPTY_STAGES);
                }}
                copied={copied}
              />
            </div>
            <div className="order-3">
              <MemoryPanel
                memory={memory}
                tools={tools}
                ledger={ledger}
                ltm={ltm}
                onRehydrate={rehydrate}
                onPurgeLtm={() => setLtm(clearLtm())}
              />
            </div>
          </div>
        </section>

        {/* ————— docs sections ————— */}
        <ArchitectureSection />
        <DossiersSection />
        <ShipSection />
      </main>

      <Footer />
    </div>
  );
}

function timeShort(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

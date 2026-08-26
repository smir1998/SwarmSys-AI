import { useCallback, useEffect, useRef, useState } from "react";
import AgentRoster from "./components/AgentRoster";
import ArchitectureSection from "./components/ArchitectureSection";
import DossiersSection from "./components/DossiersSection";
import Footer from "./components/Footer";
import MemoryPanel from "./components/MemoryPanel";
import NotifyToasts, { askNotifyPermission, browserNotify } from "./components/NotifyToasts";
import Pipeline from "./components/Pipeline";
import SchedulerPanel from "./components/SchedulerPanel";
import ShipSection from "./components/ShipSection";
import TaskConsole from "./components/TaskConsole";
import TopBar from "./components/TopBar";
import { Orchestrator } from "./lib/engine";
import { HF_MODELS, detectDomain } from "./lib/knowledge";
import {
  addOperator,
  clearLtm,
  loadActiveOp,
  loadLedger,
  loadLtm,
  loadOperators,
  loadSchedules,
  pushLedger,
  saveActiveOp,
  saveSchedules,
  touchLtm,
} from "./lib/store";
import type {
  AgentId,
  AgentRuntime,
  LtmEntry,
  MemoryEntry,
  Operator,
  Origin,
  Phase,
  RunRecord,
  Schedule,
  StageLine,
  Subtask,
  ToastMsg,
  ToolCall,
  ViewId,
} from "./lib/types";
import { usePRM } from "./lib/ui";

const IDLE_AGENTS: Record<AgentId, AgentRuntime> = {
  planner: { status: "idle", startedAt: 0, meta: "" },
  research: { status: "idle", startedAt: 0, meta: "" },
  coder: { status: "idle", startedAt: 0, meta: "" },
  qa: { status: "idle", startedAt: 0, meta: "" },
  reviewer: { status: "idle", startedAt: 0, meta: "" },
  security: { status: "idle", startedAt: 0, meta: "" },
  devops: { status: "idle", startedAt: 0, meta: "" },
  reporter: { status: "idle", startedAt: 0, meta: "" },
};

const EMPTY_STAGES: Record<AgentId, StageLine[]> = {
  planner: [],
  research: [],
  coder: [],
  qa: [],
  reviewer: [],
  security: [],
  devops: [],
  reporter: [],
};

export default function App() {
  const prm = usePRM();

  /* ————— run state ————— */
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
  const [lastTask, setLastTask] = useState("");

  /* ————— console settings ————— */
  const [task, setTask] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [liveWeb, setLiveWeb] = useState(true);
  const [modelId, setModelId] = useState(HF_MODELS[0].id);
  const [notifyOn, setNotifyOn] = useState(false);

  /* ————— advanced: operators, scheduler, notifications ————— */
  const [operators, setOperators] = useState<Operator[]>(() => loadOperators());
  const [activeId, setActiveId] = useState<string>(() => loadActiveOp());
  const [ledger, setLedger] = useState<RunRecord[]>(() => loadLedger(loadActiveOp()));
  const [ltm, setLtm] = useState<LtmEntry[]>(() => loadLtm(loadActiveOp()));
  const [schedules, setSchedules] = useState<Schedule[]>(() => loadSchedules());
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const active = operators.find((o) => o.id === activeId) ?? operators[0];
  const orchRef = useRef<Orchestrator | null>(null);
  const runningRef = useRef(false);
  const schedulesRef = useRef(schedules);
  const liveCountRef = useRef(0);

  const running =
    phase === "planning" ||
    phase === "approval" ||
    phase === "execution" ||
    phase === "qa" ||
    phase === "review" ||
    phase === "hardening" ||
    phase === "report";

  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  /* ————— toasts ————— */
  const pushToast = useCallback((kind: ToastMsg["kind"], title: string, body?: string) => {
    setToasts((prev) => [...prev.slice(-3), { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind, title, body }]);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  /* ————— horizontal view switching (no long scroll) ————— */
  const [view, setView] = useState<ViewId>("console");
  const switchView = useCallback(
    (v: ViewId) => {
      setView(v);
      window.scrollTo({ top: 0, behavior: prm ? "auto" : "smooth" });
    },
    [prm],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const map: Record<string, ViewId> = { "1": "console", "2": "architecture", "3": "agents", "4": "ship" };
      if (map[e.key]) switchView(map[e.key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [switchView]);

  const toggleNotify = useCallback(async () => {
    if (!notifyOn) {
      const ok = await askNotifyPermission();
      if (ok) {
        setNotifyOn(true);
        pushToast("info", "Notifications armed", "browser will ping on completions while the tab is hidden");
      } else {
        pushToast("warn", "Notifications blocked", "permission denied — in-console toasts still fire");
      }
    } else {
      setNotifyOn(false);
    }
  }, [notifyOn, pushToast]);

  /* ————— operators ————— */
  const switchOp = useCallback(
    (id: string) => {
      const op = operators.find((o) => o.id === id);
      if (!op || id === activeId) return;
      setActiveId(id);
      saveActiveOp(id);
      setLedger(loadLedger(id));
      setLtm(loadLtm(id));
      pushToast("info", `Operator: ${op.name}`, "ledger & long-term memory re-scoped to this seat");
    },
    [operators, activeId, pushToast],
  );
  const addOp = useCallback(
    (name: string) => {
      const { list, op } = addOperator(name);
      setOperators(list);
      setActiveId(op.id);
      saveActiveOp(op.id);
      setLedger(loadLedger(op.id));
      setLtm(loadLtm(op.id));
      pushToast("ok", `Seat created: ${op.name}`, "fresh ledger, fresh long-term memory");
    },
    [pushToast],
  );

  /* ————— the swarm ————— */
  const runSwarm = useCallback(
    (opts?: { taskOverride?: string; origin?: Origin }) => {
      const goal = (opts?.taskOverride ?? task).trim();
      if (!goal) return;
      const origin: Origin = opts?.origin ?? "manual";

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
      setLastTask(goal);
      liveCountRef.current = 0;

      const opId = active.id;
      const opName = active.name;
      const ltmSnapshot = loadLtm(opId);
      const wantNotify = notifyOn;

      const orch = new Orchestrator({
        liveWeb,
        operator: opName,
        origin,
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
        onMemory: (e) => {
          setMemory((prev) => [...prev, e]);
          if (e.key === "research.live.sources" || e.key === "research.repos")
            liveCountRef.current += e.value.split(" | ").length;
        },
        onTool: (t) => setTools((prev) => [...prev, t]),
        onReport: (md, sc, wall) => {
          setReport(md);
          setScore(sc);
          setWallMs(wall);
        },
        onComplete: (rec) => {
          setLedger(pushLedger(opId, rec));
          const domain = detectDomain(rec.task);
          const model = domain.research.memory[0]?.[1] ?? "—";
          setLtm(touchLtm(opId, domain.id, model, liveCountRef.current));
          pushToast("ok", "Run complete", `${rec.domain} · quality ${rec.score}/100 · ${(rec.wallMs / 1000).toFixed(1)}s wall`);
          if (wantNotify && document.hidden)
            browserNotify("SwarmSys AI — run complete", `${rec.task.slice(0, 70)} · score ${rec.score}/100`);
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
          pushToast("warn", "Run aborted", "the swarm returned to standby");
        },
      });
      orchRef.current = orch;
      void orch.run(goal, autoApprove || origin === "schedule", ltmSnapshot, modelId);

      document.getElementById("console")?.scrollIntoView({ behavior: prm ? "auto" : "smooth", block: "start" });
    },
    [task, autoApprove, liveWeb, modelId, active, notifyOn, prm, pushToast],
  );

  const runRef = useRef(runSwarm);
  useEffect(() => {
    runRef.current = runSwarm;
  }, [runSwarm]);

  /* ————— autonomous scheduler ————— */
  useEffect(() => {
    const tick = () => {
      if (runningRef.current) return;
      const now = Date.now();
      const due = schedulesRef.current.find((s) => s.enabled && now >= s.nextDue);
      if (!due) return;
      const next = schedulesRef.current.map((s) =>
        s.id === due.id ? { ...s, runs: s.runs + 1, nextDue: now + s.everyMin * 60_000 } : s,
      );
      schedulesRef.current = next;
      setSchedules(next);
      saveSchedules(next);
      pushToast("info", "Scheduled run triggered", `${due.task.slice(0, 60)} · gate bypassed by policy`);
      runRef.current({ taskOverride: due.task, origin: "schedule" });
    };
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [pushToast]);

  const addSchedule = useCallback(
    (t: string, everyMin: number) => {
      const s: Schedule = {
        id: `sch-${Date.now().toString(36)}`,
        task: t.trim(),
        everyMin,
        nextDue: Date.now() + everyMin * 60_000,
        runs: 0,
        enabled: true,
        createdAt: Date.now(),
      };
      setSchedules((prev) => {
        const next = [...prev, s];
        saveSchedules(next);
        return next;
      });
      pushToast("ok", "Schedule armed", `every ${everyMin} min · runs auto-execute with the gate bypassed`);
    },
    [pushToast],
  );
  const toggleSchedule = useCallback((id: string) => {
    setSchedules((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled, nextDue: s.enabled ? s.nextDue : Date.now() + s.everyMin * 60_000 } : s,
      );
      saveSchedules(next);
      return next;
    });
  }, []);
  const deleteSchedule = useCallback((id: string) => {
    setSchedules((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSchedules(next);
      return next;
    });
  }, []);

  /* ————— report actions ————— */
  const rehydrate = useCallback(
    (rec: RunRecord) => {
      setReport(rec.report);
      setScore(rec.score);
      setWallMs(rec.wallMs);
      setLastTask(rec.task);
      setLedgerNote(`from ledger · ${timeShort(rec.at)} · ${rec.operator ?? "operator"}`);
      setPhase("complete");
      setAgents(IDLE_AGENTS);
      setStages(EMPTY_STAGES);
      setSubtasks([]);
      setMemory([]);
      setTools([]);
      switchView("console");
    },
    [switchView],
  );

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

  const exportPdf = useCallback(async () => {
    const { reportToPdf } = await import("./lib/pdf");
    reportToPdf(report, { task: lastTask, operator: active.name, score });
    pushToast("ok", "PDF exported", "swarmsys-ai-report.pdf — typeset client-side");
  }, [report, lastTask, active, score, pushToast]);

  return (
    <div className="relative min-h-screen">
      <div className="bg-grid" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />

      <TopBar
        phase={phase}
        runCount={ledger.length}
        view={view}
        onView={switchView}
        operators={operators}
        activeId={activeId}
        onSwitch={switchOp}
        onAdd={addOp}
        notifyOn={notifyOn}
        onToggleNotify={toggleNotify}
      />

      <main className="relative z-10">
        <div key={view} className="viewin">
        {/* ————— 00 · the orchestration console ————— */}
        {view === "console" && (
        <section id="console" className="mx-auto max-w-[1560px] px-5 pb-8 pt-[7.5rem] md:px-8 md:pt-[8rem]">
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
                parallel, <span className="text-qa">QA</span> runs the test matrix, the{" "}
                <span className="text-reviewer">reviewer</span> gates quality, <span className="text-security">security</span>{" "}
                and <span className="text-devops">devops</span> harden the ship — and the{" "}
                <span className="text-reporter">reporter</span> assembles the final response.
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut/70">
                8 agents · hf models · live web · sql · pdf · scheduler · human gate
              </p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_330px]">
            <div className="order-2 xl:order-1">
              <AgentRoster agents={agents} />
              <SchedulerPanel
                schedules={schedules}
                running={running}
                onAdd={addSchedule}
                onToggle={toggleSchedule}
                onDelete={deleteSchedule}
              />
            </div>
            <div className="order-1 min-w-0 space-y-5 xl:order-2">
              <TaskConsole
                task={task}
                setTask={setTask}
                onRun={() => runSwarm()}
                onAbort={() => orchRef.current?.abort()}
                running={running}
                autoApprove={autoApprove}
                setAutoApprove={setAutoApprove}
                liveWeb={liveWeb}
                setLiveWeb={setLiveWeb}
                modelId={modelId}
                setModelId={setModelId}
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
                onPdf={exportPdf}
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
                onPurgeLtm={() => {
                  setLtm(clearLtm(active.id));
                  pushToast("warn", "Long-term memory purged", `${active.name} starts with a clean slate`);
                }}
              />
            </div>
          </div>
        </section>
        )}

        {/* ————— toggled views ————— */}
        {view === "architecture" && <ArchitectureSection />}
        {view === "agents" && <DossiersSection />}
        {view === "ship" && <ShipSection />}
        </div>
      </main>

      <Footer onView={switchView} view={view} />
      <NotifyToasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function timeShort(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

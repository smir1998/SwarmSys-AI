import { HF_MODELS, PRESETS, type Preset } from "../lib/knowledge";
import type { Phase } from "../lib/types";
import { Icon } from "../lib/ui";

const ROLE_COLOR: Record<string, string> = {
  reasoning: "var(--c-research)",
  code: "var(--c-coder)",
  general: "var(--amber)",
  edge: "var(--mut)",
};

export default function TaskConsole({
  task,
  setTask,
  onRun,
  onAbort,
  onPreset,
  running,
  autoApprove,
  setAutoApprove,
  liveWeb,
  setLiveWeb,
  modelId,
  setModelId,
  phase,
}: {
  task: string;
  setTask: (v: string) => void;
  onRun: () => void;
  onAbort: () => void;
  onPreset: (p: Preset) => void;
  running: boolean;
  autoApprove: boolean;
  setAutoApprove: (v: boolean) => void;
  liveWeb: boolean;
  setLiveWeb: (v: boolean) => void;
  modelId: string;
  setModelId: (v: string) => void;
  phase: Phase;
}) {
  const canRun = task.trim().length > 0 && !running;
  return (
    <div className="border-2 border-line bg-panel transition-colors duration-300 focus-within:border-amber">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-mut">
          <Icon name="terminal" className="h-3.5 w-3.5 text-amber" />
          Operator input
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
          {running ? (
            <span className="text-amber">
              phase: {phase}
              <span className="blink ml-1 inline-block h-2.5 w-1.5 translate-y-[1px] bg-amber" />
            </span>
          ) : phase === "complete" ? (
            <span className="text-coder">last run: complete</span>
          ) : (
            "swarm idle — feed it a goal"
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2.5 border border-line bg-bg px-3.5 py-3 transition-colors focus-within:border-line2">
          <span className="font-mono text-sm text-amber">❯</span>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canRun) onRun();
            }}
            placeholder="Describe the task — e.g. build a spam email detector"
            aria-label="Task for the swarm"
            className="w-full bg-transparent font-mono text-base text-ink outline-none md:text-sm"
          />
        </div>
        <div className="flex flex-wrap items-stretch gap-2.5">
          {running ? (
            <button
              onClick={onAbort}
              className="flex h-[46px] flex-1 touch-manipulation items-center justify-center gap-2 border-2 border-coral px-5 font-display text-sm font-bold uppercase tracking-[0.1em] text-coral transition-all hover:bg-coral hover:text-bg sm:flex-none"
            >
              <Icon name="stop" className="h-4 w-4" />
              Abort
            </button>
          ) : (
            <button
              onClick={onRun}
              disabled={!canRun}
              className="flex h-[46px] flex-1 touch-manipulation items-center justify-center gap-2.5 bg-amber px-6 font-display text-sm font-bold uppercase tracking-[0.1em] text-[#0a0f12] transition-all duration-200 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-35 sm:flex-none"
            >
              <Icon name="play" className="h-4 w-4" />
              Run swarm
            </button>
          )}
          <button
            onClick={() => setAutoApprove(!autoApprove)}
            role="switch"
            aria-checked={autoApprove}
            title="Skip the human-approval gate"
            className={`flex h-[46px] flex-1 touch-manipulation items-center justify-center gap-2.5 border px-3.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-all sm:flex-none ${
              autoApprove
                ? "border-amber/60 bg-amber/10 text-amber"
                : "border-line text-mut hover:border-line2 hover:text-ink"
            }`}
          >
            <span
              className={`relative h-3.5 w-7 border transition-colors ${autoApprove ? "border-amber" : "border-line2"}`}
            >
              <span
                className={`absolute top-[2px] h-2 w-2 transition-all duration-200 ${
                  autoApprove ? "left-[16px] bg-amber" : "left-[2px] bg-mut"
                }`}
              />
            </span>
            auto-approve
          </button>
          <button
            onClick={() => setLiveWeb(!liveWeb)}
            role="switch"
            aria-checked={liveWeb}
            title="Agents query live Wikipedia, GitHub, HF hub and OSV.dev"
            className={`flex h-[46px] flex-1 touch-manipulation items-center justify-center gap-2.5 border px-3.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-all sm:flex-none ${
              liveWeb
                ? "border-research/60 bg-research/10 text-research"
                : "border-line text-mut hover:border-line2 hover:text-ink"
            }`}
          >
            <span
              className={`relative h-3.5 w-7 border transition-colors ${liveWeb ? "border-research" : "border-line2"}`}
            >
              <span
                className={`absolute top-[2px] h-2 w-2 transition-all duration-200 ${
                  liveWeb ? "left-[16px] bg-research" : "left-[2px] bg-mut"
                }`}
              />
            </span>
            live web
          </button>
        </div>
      </div>

      {/* Hugging Face model selector — role-tagged, planner allocates per agent */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mut">hf model:</span>
        {HF_MODELS.map((m) => {
          const active = m.id === modelId;
          const rc = ROLE_COLOR[m.role];
          return (
            <button
              key={m.id}
              onClick={() => setModelId(m.id)}
              disabled={running}
              title={`${m.id} · ${m.role} · ${m.ctx} context · quality ×${m.quality} · speed ×${m.speed} — the planner allocates role-matched specialists to every agent`}
              className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] transition-all duration-200 disabled:opacity-40 ${
                active ? "bg-panel2" : "text-mut hover:border-line2 hover:text-ink"
              }`}
              style={
                active
                  ? { borderColor: rc, color: rc, boxShadow: `0 0 16px -8px ${rc}` }
                  : { borderColor: "var(--line)" }
              }
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "led-on" : ""}`}
                style={{ background: active ? rc : "var(--line2)" }}
              />
              {m.label}
              <span className="opacity-60">{m.params}</span>
            </button>
          );
        })}
        <span className="ml-auto hidden font-mono text-[9px] uppercase tracking-[0.14em] text-mut/70 lg:inline">
          <span className="text-research">●</span> reasoning <span className="text-coder ml-1.5">●</span> code{" "}
          <span className="text-amber ml-1.5">●</span> general <span className="text-mut ml-1.5">●</span> edge
        </span>
      </div>

      {/* predefined preset cases — task + model + policy in one click */}
      <div className="border-t border-line px-4 py-3.5">
        <p className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
          <Icon name="zap" className="h-3 w-3 text-amber" />
          preset cases · task + model + gate policy bundled
          <span className="hidden text-mut/60 sm:inline">— one click arms the swarm</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {PRESETS.map((p) => {
            const armed =
              task === p.task && modelId === p.modelId && autoApprove === p.autoApprove && liveWeb === p.liveWeb;
            return (
              <button
                key={p.id}
                onClick={() => onPreset(p)}
                disabled={running}
                title={`${p.task} · ${p.modelId}`}
                className={`group border px-2.5 py-2 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                  armed
                    ? "border-amber bg-amber/10 shadow-[0_0_18px_-8px_var(--amber)]"
                    : "border-line hover:-translate-y-px hover:border-line2 hover:bg-panel2"
                }`}
              >
                <p
                  className={`flex items-center justify-between gap-1 font-display text-[11px] font-bold uppercase tracking-[0.04em] ${
                    armed ? "text-amber" : "text-ink/85 group-hover:text-ink"
                  }`}
                >
                  {p.label}
                  {armed && <span className="led-on h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />}
                </p>
                <p className="mt-1 font-mono text-[8.5px] leading-snug text-mut">{p.note}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

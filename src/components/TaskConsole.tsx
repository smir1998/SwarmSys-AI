import { HF_MODELS, SAMPLE_TASKS } from "../lib/knowledge";
import type { Phase } from "../lib/types";
import { Icon } from "../lib/ui";

export default function TaskConsole({
  task,
  setTask,
  onRun,
  onAbort,
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
            className="w-full bg-transparent font-mono text-sm text-ink outline-none"
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

      {/* Hugging Face model selector */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mut">hf model:</span>
        {HF_MODELS.map((m) => {
          const active = m.id === modelId;
          return (
            <button
              key={m.id}
              onClick={() => setModelId(m.id)}
              disabled={running}
              title={`${m.id} · ${m.ctx} context · quality ×${m.quality} · speed ×${m.speed}`}
              className={`border px-2.5 py-1 font-mono text-[10px] transition-all duration-200 disabled:opacity-40 ${
                active
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-line text-mut hover:border-line2 hover:text-ink"
              }`}
            >
              {m.label}
              <span className={`ml-1.5 ${active ? "text-amber/70" : "text-mut/60"}`}>{m.params}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mut">try:</span>
        {SAMPLE_TASKS.map((s) => (
          <button
            key={s}
            onClick={() => setTask(s)}
            disabled={running}
            className="border border-line px-2.5 py-1 font-mono text-[10px] text-mut transition-all duration-200 hover:border-amber hover:text-amber disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import type { Schedule } from "../lib/types";
import { Icon, useNow } from "../lib/ui";

export default function SchedulerPanel({
  schedules,
  running,
  onAdd,
  onToggle,
  onDelete,
}: {
  schedules: Schedule[];
  running: boolean;
  onAdd: (task: string, everyMin: number) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [task, setTask] = useState("");
  const [every, setEvery] = useState(15);
  const now = useNow(true, 1000);

  const countdown = (s: Schedule): string => {
    if (!s.enabled) return "paused";
    const msLeft = s.nextDue - now;
    if (msLeft <= 0) return "due now";
    if (msLeft < 3_600_000) return `in ${Math.floor(msLeft / 60_000)}m ${String(Math.floor((msLeft % 60_000) / 1000)).padStart(2, "0")}s`;
    return `in ${Math.floor(msLeft / 3_600_000)}h ${Math.floor((msLeft % 3_600_000) / 60_000)}m`;
  };

  return (
    <aside className="mt-2.5 border border-line bg-panel" aria-label="Autonomous scheduler">
      <p className="flex items-center justify-between border-b border-line px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-mut">
        Autonomous scheduler
        <span className={`flex items-center gap-1.5 ${running ? "text-amber" : "text-mut/60"}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${running ? "led-fast bg-amber" : "bg-mut/40"}`} />
          {running ? "busy" : "armed"}
        </span>
      </p>

      <div className="space-y-2 p-3.5">
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Recurring task… e.g. sentiment pulse"
          aria-label="Scheduled task description"
          className="w-full border border-line bg-bg px-3 py-2 font-mono text-base text-ink outline-none transition-colors focus:border-amber md:text-[11px]"
        />
        <div className="flex gap-2">
          <select
            value={every}
            onChange={(e) => setEvery(Number(e.target.value))}
            aria-label="Run interval"
            className="h-9 flex-1 border border-line bg-bg px-2 font-mono text-[11px] text-ink outline-none"
          >
            {[5, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                every {m} min
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (task.trim()) {
                onAdd(task, every);
                setTask("");
              }
            }}
            disabled={!task.trim()}
            className="flex h-9 items-center gap-1.5 bg-amber px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0a0f12] transition-all hover:bg-ink hover:text-bg disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Icon name="zap" className="h-3 w-3" />
            Schedule
          </button>
        </div>

        <div className="space-y-1.5 pt-1">
          {schedules.length === 0 ? (
            <p className="py-3 text-center font-mono text-[10px] leading-relaxed text-mut/60">
              no schedules — the swarm sleeps between runs.
              <br />
              due runs auto-execute, gate bypassed
            </p>
          ) : (
            schedules.map((s) => {
              const due = s.enabled && s.nextDue - now <= 0;
              return (
                <div
                  key={s.id}
                  className={`sline border px-2.5 py-2 transition-colors ${due ? "gate-pulse border-amber/60 bg-amber/5" : "border-line bg-bg"}`}
                >
                  <p className="truncate font-mono text-[10.5px] text-ink/85">{s.task}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className={`font-mono text-[9px] uppercase tracking-[0.12em] ${due ? "text-amber" : "text-mut"}`}>
                      {countdown(s)} · {s.runs} run{s.runs === 1 ? "" : "s"} · /{s.everyMin}m
                    </span>
                    <span className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggle(s.id)}
                        role="switch"
                        aria-checked={s.enabled}
                        aria-label={`Toggle schedule: ${s.task}`}
                        className={`relative h-3.5 w-7 border transition-colors ${s.enabled ? "border-amber" : "border-line2"}`}
                      >
                        <span
                          className={`absolute top-[2px] h-2 w-2 transition-all duration-200 ${
                            s.enabled ? "left-[16px] bg-amber" : "left-[2px] bg-mut"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => onDelete(s.id)}
                        aria-label={`Delete schedule: ${s.task}`}
                        className="text-mut transition-colors hover:text-coral"
                      >
                        <Icon name="close" className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="border-t border-line pt-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-mut/70">
          schedules persist to this browser · completions land in the ledger + toasts
        </p>
      </div>
    </aside>
  );
}

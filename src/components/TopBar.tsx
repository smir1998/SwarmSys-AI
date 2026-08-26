import { useEffect, useState } from "react";
import type { Phase } from "../lib/types";

const PHASE_META: Record<Phase, { label: string; color: string; pulse: boolean }> = {
  idle: { label: "STANDBY", color: "var(--mut)", pulse: false },
  planning: { label: "SWARM RUNNING", color: "var(--amber)", pulse: true },
  approval: { label: "AWAITING OPERATOR", color: "var(--amber)", pulse: true },
  execution: { label: "SWARM RUNNING", color: "var(--amber)", pulse: true },
  review: { label: "SWARM RUNNING", color: "var(--amber)", pulse: true },
  report: { label: "SWARM RUNNING", color: "var(--amber)", pulse: true },
  complete: { label: "RUN COMPLETE", color: "var(--c-coder)", pulse: false },
  aborted: { label: "RUN ABORTED", color: "var(--coral)", pulse: false },
};

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="tabular-nums">
      {p(now.getUTCHours())}:{p(now.getUTCMinutes())}:{p(now.getUTCSeconds())} UTC
    </span>
  );
}

export default function TopBar({ phase, runCount }: { phase: Phase; runCount: number }) {
  const meta = PHASE_META[phase];
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1560px] items-center justify-between gap-4 px-5 md:px-8">
        <a href="#console" className="group flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber transition-transform duration-300 group-hover:rotate-[18deg]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 19L12 5l8 14z" />
            <circle cx="12" cy="5" r="2.2" fill="var(--c-research)" stroke="none" />
            <circle cx="8" cy="19" r="2.2" fill="var(--c-coder)" stroke="none" />
            <circle cx="16" cy="19" r="2.2" fill="var(--coral)" stroke="none" />
          </svg>
          <span className="font-display text-lg font-bold uppercase tracking-[0.08em]">
            SwarmSys<span className="text-amber"> AI</span>
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-mut sm:inline">
            multi-agent console
          </span>
        </a>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Sections">
          {[
            ["#console", "Console"],
            ["#architecture", "Architecture"],
            ["#agents", "Agents"],
            ["#ship", "Ship it"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut transition-colors hover:text-amber"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-6">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-mut md:inline">
            ledger: {runCount} run{runCount === 1 ? "" : "s"}
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-mut lg:inline">
            <Clock />
          </span>
          <span className="flex items-center gap-2 border border-line px-2.5 py-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${meta.pulse ? "led-fast" : ""}`}
              style={{ background: meta.color }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}

import { useEffect, useState } from "react";
import type { Operator, Phase } from "../lib/types";

const PHASE_META: Record<Phase, { label: string; color: string; pulse: boolean }> = {
  idle: { label: "STANDBY", color: "var(--mut)", pulse: false },
  planning: { label: "SWARM RUNNING", color: "var(--amber)", pulse: true },
  approval: { label: "AWAITING OPERATOR", color: "var(--amber)", pulse: true },
  execution: { label: "SWARM RUNNING", color: "var(--amber)", pulse: true },
  qa: { label: "SWARM RUNNING", color: "var(--amber)", pulse: true },
  review: { label: "SWARM RUNNING", color: "var(--amber)", pulse: true },
  hardening: { label: "SWARM RUNNING", color: "var(--amber)", pulse: true },
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

export default function TopBar({
  phase,
  runCount,
  operators,
  activeId,
  onSwitch,
  onAdd,
  notifyOn,
  onToggleNotify,
}: {
  phase: Phase;
  runCount: number;
  operators: Operator[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: (name: string) => void;
  notifyOn: boolean;
  onToggleNotify: () => void;
}) {
  const meta = PHASE_META[phase];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const active = operators.find((o) => o.id === activeId) ?? operators[0];

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

        <div className="flex items-center gap-3 md:gap-5">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-mut xl:inline">
            ledger: {runCount} run{runCount === 1 ? "" : "s"}
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-mut xl:inline">
            <Clock />
          </span>

          {/* notifications */}
          <button
            onClick={onToggleNotify}
            className={`flex items-center gap-2 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-all ${
              notifyOn ? "border-research/60 text-research" : "border-line text-mut hover:border-line2 hover:text-ink"
            }`}
            title="Arm browser notifications for run completions"
          >
            <span className={`inline-block h-2 w-2 rounded-full ${notifyOn ? "led-on bg-research" : "bg-mut/50"}`} />
            <span className="hidden sm:inline">{notifyOn ? "notify on" : "notify"}</span>
          </button>

          {/* operator seat */}
          <div className="relative">
            {open && (
              <button className="fixed inset-0 z-40 cursor-default" aria-label="Close operator menu" onClick={() => setOpen(false)} />
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className={`flex items-center gap-2 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-all ${
                open ? "border-amber text-amber" : "border-line text-mut hover:border-line2 hover:text-ink"
              }`}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
              </svg>
              <span className="max-w-[110px] truncate">{active?.name}</span>
              <span className="text-amber">▾</span>
            </button>
            {open && (
              <div className="popin absolute right-0 top-full z-50 mt-2 w-60 border border-line bg-panel2 shadow-[0_22px_50px_-18px_rgba(0,0,0,0.9)]" role="menu">
                <p className="border-b border-line px-3.5 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mut">
                  operator seats · scoped memory
                </p>
                {operators.map((o) => (
                  <button
                    key={o.id}
                    role="menuitem"
                    onClick={() => {
                      onSwitch(o.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left font-mono text-[11px] transition-colors hover:bg-panel ${
                      o.id === activeId ? "text-amber" : "text-ink/80"
                    }`}
                  >
                    {o.name}
                    {o.id === activeId && <span className="text-[9px] uppercase tracking-[0.14em]">active</span>}
                  </button>
                ))}
                <div className="flex border-t border-line">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && draft.trim()) {
                        onAdd(draft);
                        setDraft("");
                        setOpen(false);
                      }
                    }}
                    placeholder="new operator…"
                    aria-label="New operator name"
                    className="w-full bg-transparent px-3.5 py-2.5 font-mono text-[11px] text-ink outline-none"
                  />
                  <button
                    onClick={() => {
                      if (draft.trim()) {
                        onAdd(draft);
                        setDraft("");
                        setOpen(false);
                      }
                    }}
                    className="shrink-0 bg-amber px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0a0f12] transition-colors hover:bg-ink hover:text-bg"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="hidden items-center gap-2 border border-line px-2.5 py-1.5 md:flex">
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

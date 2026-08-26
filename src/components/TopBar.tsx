import { useEffect, useState } from "react";
import type { Operator, Phase, ViewId } from "../lib/types";

export const VIEWS: { id: ViewId; label: string }[] = [
  { id: "console", label: "Console" },
  { id: "architecture", label: "Architecture" },
  { id: "agents", label: "Agents" },
  { id: "ship", label: "Ship It" },
];

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
  view,
  onView,
  operators,
  activeId,
  onSwitch,
  onAdd,
  notifyOn,
  onToggleNotify,
}: {
  phase: Phase;
  runCount: number;
  view: ViewId;
  onView: (v: ViewId) => void;
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
  const busy = meta.pulse;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
      {/* ————— status row ————— */}
      <div className="mx-auto flex h-14 max-w-[1560px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-5 md:px-8">
        <button onClick={() => onView("console")} className="group flex min-w-0 items-center gap-2.5 text-left sm:gap-3">
          <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-amber transition-transform duration-300 group-hover:rotate-[18deg]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 19L12 5l8 14z" />
            <circle cx="12" cy="5" r="2.2" fill="var(--c-research)" stroke="none" />
            <circle cx="8" cy="19" r="2.2" fill="var(--c-coder)" stroke="none" />
            <circle cx="16" cy="19" r="2.2" fill="var(--coral)" stroke="none" />
          </svg>
          <span className="truncate font-display text-base font-bold uppercase tracking-[0.08em] sm:text-lg">
            SwarmSys<span className="text-amber"> AI</span>
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-mut lg:inline">
            multi-agent console
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-5">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-mut xl:inline">
            ledger: {runCount} run{runCount === 1 ? "" : "s"}
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-mut xl:inline">
            <Clock />
          </span>

          {/* notifications */}
          <button
            onClick={onToggleNotify}
            className={`flex touch-manipulation items-center gap-2 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-all sm:px-2.5 ${
              notifyOn ? "border-research/60 text-research" : "border-line text-mut hover:border-line2 hover:text-ink"
            }`}
            title="Arm browser notifications for run completions"
          >
            <span className={`inline-block h-2 w-2 rounded-full ${notifyOn ? "led-on bg-research" : "bg-mut/50"}`} />
            <span className="hidden md:inline">{notifyOn ? "notify on" : "notify"}</span>
          </button>

          {/* operator seat */}
          <div className="relative">
            {open && (
              <button className="fixed inset-0 z-40 cursor-default" aria-label="Close operator menu" onClick={() => setOpen(false)} />
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className={`flex touch-manipulation items-center gap-1.5 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-all sm:gap-2 sm:px-2.5 ${
                open ? "border-amber text-amber" : "border-line text-mut hover:border-line2 hover:text-ink"
              }`}
              aria-haspopup="menu"
              aria-expanded={open}
              title="Operator seats — memory & ledger are scoped per seat"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
              </svg>
              <span className="hidden max-w-[110px] truncate min-[400px]:inline">{active?.name}</span>
              <span className="text-amber">▾</span>
            </button>
            {open && (
              <div className="popin absolute right-0 top-full z-50 mt-2 w-[min(240px,calc(100vw-2rem))] border border-line bg-panel2 shadow-[0_22px_50px_-18px_rgba(0,0,0,0.9)]" role="menu">
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
                    <span className="truncate">{o.name}</span>
                    {o.id === activeId && <span className="ml-2 shrink-0 text-[9px] uppercase tracking-[0.14em]">active</span>}
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

          {/* live status — always visible, label on wider screens */}
          <span className="flex touch-manipulation items-center gap-1.5 border border-line px-2 py-1.5 sm:gap-2 sm:px-2.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${meta.pulse ? "led-fast" : ""}`}
              style={{ background: meta.color }}
            />
            <span
              className="hidden font-mono text-[9px] uppercase tracking-[0.16em] min-[430px]:inline md:text-[10px]"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
          </span>
        </div>
      </div>

      {/* ————— horizontal view rail ————— */}
      <nav
        aria-label="Console views"
        className="mx-auto grid max-w-[1560px] grid-cols-4 items-stretch border-t border-line px-1 md:flex md:gap-0.5 md:px-8"
      >
        {VIEWS.map((v, i) => {
          const isActive = v.id === view;
          const showBusy = v.id === "console" && busy && !isActive;
          return (
            <button
              key={v.id}
              onClick={() => onView(v.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 touch-manipulation items-center justify-center gap-1.5 px-1.5 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 md:justify-start md:gap-2.5 md:px-5 md:text-[10px] md:tracking-[0.18em] ${
                isActive ? "text-amber" : "text-mut hover:text-ink"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${isActive ? "led-on" : ""}`}
                style={{ background: isActive ? "var(--amber)" : "var(--line2)" }}
              />
              <span className="hidden opacity-55 min-[380px]:inline md:inline">0{i + 1}</span>
              <span className="truncate">{v.label}</span>
              {showBusy && (
                <span
                  className={`led-fast h-1.5 w-1.5 shrink-0 rounded-full ${phase === "approval" ? "bg-coral" : "bg-amber"}`}
                  title={phase === "approval" ? "Approval gate waiting on the console" : "Swarm running on the console"}
                />
              )}
              <span
                className={`absolute inset-x-2 bottom-0 h-[2px] origin-left bg-amber transition-transform duration-300 ease-out md:inset-x-3 ${
                  isActive ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          );
        })}
        <span className="ml-auto hidden shrink-0 items-center self-center gap-3 pl-4 font-mono text-[9px] uppercase tracking-[0.16em] text-mut/60 lg:flex">
          <span>keys 1–4 switch view</span>
          <span className="h-3 w-px bg-line2" />
          <span>no scroll — toggle panels</span>
        </span>
      </nav>
    </header>
  );
}

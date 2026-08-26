import { AGENTS, AGENT_ORDER } from "../lib/knowledge";
import type { ViewId } from "../lib/types";
import { Icon } from "../lib/ui";
import { VIEWS } from "./TopBar";

export default function Footer({ view, onView }: { view: ViewId; onView: (v: ViewId) => void }) {
  return (
    <footer className="relative border-t-2 border-line2">
      <div className="mx-auto grid max-w-[1560px] gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr] md:px-8">
        <div>
          <button onClick={() => onView("console")} className="group flex items-center gap-3 text-left">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber transition-transform duration-300 group-hover:rotate-[18deg]" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 19L12 5l8 14z" />
              <circle cx="12" cy="5" r="2.2" fill="var(--c-research)" stroke="none" />
              <circle cx="8" cy="19" r="2.2" fill="var(--c-coder)" stroke="none" />
              <circle cx="16" cy="19" r="2.2" fill="var(--coral)" stroke="none" />
            </svg>
            <span className="font-display text-lg font-bold uppercase tracking-[0.08em]">
              SwarmSys<span className="text-amber"> AI</span>
            </span>
          </button>
          <p className="mt-4 max-w-[46ch] font-body text-[13px] leading-relaxed text-mut">
            A multi-agent AI system running entirely in your browser. Eight specialized agents —
            planner, research, coder, QA, reviewer, security, devops, reporter — collaborate through
            one shared memory store, with Hugging Face models, live tool calls, a human-approval gate
            and a reviewer patch loop. Toggle between the four panels above — nothing lives down a
            long scroll.
          </p>
          <p className="mt-5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-mut/70">
            no network keys required · ledger &amp; long-term memory persist per operator
          </p>
        </div>

        <nav aria-label="Console panels">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber">Panels</p>
          <ul className="mt-4 space-y-2.5 font-mono text-[12px]">
            {VIEWS.map((v, i) => (
              <li key={v.id}>
                <button
                  onClick={() => onView(v.id)}
                  className={`group flex items-center gap-2.5 transition-colors hover:text-amber ${
                    view === v.id ? "text-amber" : "text-mut"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${view === v.id ? "led-on bg-amber" : "bg-line2 group-hover:bg-amber/60"}`}
                  />
                  <span className="opacity-55">0{i + 1}</span>
                  {v.label}
                  {view === v.id && <span className="text-[9px] uppercase tracking-[0.16em] opacity-70">· open</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber">The swarm</p>
          <ul className="mt-4 space-y-2.5">
            {AGENT_ORDER.map((id, i) => (
              <li key={id} className="flex items-center gap-2.5 font-mono text-[12px] text-mut">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: AGENTS[id].color }} />
                <span className="text-ink/75">A{i + 1} · {AGENTS[id].name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-4 px-5 py-5 font-mono text-[10px] uppercase tracking-[0.16em] text-mut md:px-8">
          <span>© 2026 SwarmSys AI · a multi-agent orchestration study</span>
          <span className="hidden md:inline">plan → exec∥ → qa → review↺ → harden∥ → report</span>
          <button
            onClick={() => onView("console")}
            className="group flex items-center gap-2 border border-line px-3.5 py-2 transition-all hover:border-amber hover:text-amber"
          >
            Back to console
            <Icon name="up" className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}

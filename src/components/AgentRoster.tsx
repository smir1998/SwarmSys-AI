import { AGENTS, AGENT_ORDER } from "../lib/knowledge";
import type { AgentId, AgentRuntime } from "../lib/types";
import { useNow } from "../lib/ui";

function StatusWord({ rt }: { rt: AgentRuntime }) {
  const now = useNow(rt.status === "thinking" || rt.status === "working", 200);
  if (rt.status === "idle") return <span className="text-mut">awaiting task</span>;
  if (rt.status === "done") return <span className="text-coder">{rt.meta}</span>;
  const elapsed = ((now - rt.startedAt) / 1000).toFixed(1);
  return (
    <span style={{ color: "var(--amber)" }}>
      {rt.status === "thinking" ? "thinking" : "working"} · {elapsed}s
    </span>
  );
}

export default function AgentRoster({ agents }: { agents: Record<AgentId, AgentRuntime> }) {
  return (
    <aside className="space-y-2.5" aria-label="Agent roster">
      <p className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-mut">
        Agent roster
        <span className="text-amber">8 specialists</span>
      </p>
      {AGENT_ORDER.map((id, i) => {
        const def = AGENTS[id];
        const rt = agents[id];
        const active = rt.status === "thinking" || rt.status === "working";
        return (
          <div
            key={id}
            className="relative border border-line bg-panel p-3.5 transition-all duration-300"
            style={{
              borderLeft: `3px solid ${def.color}`,
              boxShadow: active ? `0 0 24px -8px ${def.color}` : undefined,
              background: active ? "var(--panel2)" : undefined,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-sm font-bold uppercase tracking-[0.06em]">
                <span className="mr-2 font-mono text-[10px] font-medium text-mut">A{i + 1}</span>
                {def.name}
              </p>
              <span
                className={`inline-block h-2 w-2 rounded-full ${active ? (rt.status === "thinking" ? "led-on" : "led-fast") : ""}`}
                style={{ background: rt.status === "idle" ? "var(--line2)" : def.color }}
              />
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-mut">{def.role}</p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {def.tools.map((t) => (
                  <span key={t} className="border border-line px-1.5 py-0.5 font-mono text-[9px] text-mut">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-2 border-t border-line pt-2 font-mono text-[10px] tracking-wide">
              <StatusWord rt={rt} />
            </p>
          </div>
        );
      })}
      <p className="px-1 pt-1 font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-mut/70">
        each agent owns one job — orchestration, not omniscience
      </p>
    </aside>
  );
}

import { AGENTS } from "../lib/knowledge";
import type { AgentId } from "../lib/types";
import { Reveal, SectionHead } from "../lib/ui";

function Node({
  x,
  y,
  label,
  sub,
  color,
  ghost = false,
}: {
  x: number;
  y: number;
  label: string;
  sub: string;
  color: string;
  ghost?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={130}
        height={46}
        rx={3}
        fill={ghost ? "transparent" : "var(--panel)"}
        stroke={ghost ? "var(--line2)" : color}
        strokeDasharray={ghost ? "4 4" : undefined}
        strokeWidth={1.2}
      />
      {!ghost && <circle cx={x + 16} cy={y + 23} r={3.5} fill={color} />}
      <text
        x={x + (ghost ? 65 : 28)}
        y={y + 20}
        fill={ghost ? "var(--mut)" : "var(--ink)"}
        fontSize={12.5}
        fontFamily="Chakra Petch, sans-serif"
        fontWeight={700}
        textAnchor={ghost ? "middle" : "start"}
        letterSpacing={1}
      >
        {label.toUpperCase()}
      </text>
      <text
        x={x + (ghost ? 65 : 28)}
        y={y + 35}
        fill="var(--mut)"
        fontSize={7.5}
        fontFamily="IBM Plex Mono, monospace"
        textAnchor={ghost ? "middle" : "start"}
        letterSpacing={1.2}
      >
        {sub}
      </text>
    </g>
  );
}

const EDGE = "var(--line2)";

function Flow({ d, color = "var(--amber)" }: { d: string; color?: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={EDGE} strokeWidth={1.2} markerEnd="url(#arrowhead)" />
      <path d={d} fill="none" stroke={color} strokeWidth={1.4} className="edge-flow" opacity={0.85} />
    </>
  );
}

export default function ArchitectureSection() {
  const c = (id: AgentId) => AGENTS[id].color;
  return (
    <section id="architecture" className="relative mx-auto max-w-[1560px] px-5 py-20 md:px-8 md:py-28">
      <SectionHead
        no="01"
        title="Orchestration Map"
        desc="One topology, five specialists. The planner fans work out to research and coder in parallel; the reviewer gates everything and can loop code back for one patch round."
      />

      <Reveal className="mt-12">
        <div className="overflow-x-auto border border-line bg-panel p-4 md:p-8">
          <svg viewBox="0 0 980 320" className="min-w-[760px]" role="img" aria-label="Agent workflow diagram">
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8" fill="none" stroke={EDGE} strokeWidth={1.2} />
              </marker>
            </defs>

            <Flow d="M150,160 L193,160" />
            <Flow d="M325,146 C375,128 385,92 403,84" color={c("research")} />
            <Flow d="M325,174 C375,192 385,228 403,236" color={c("coder")} />
            <Flow d="M535,84 C575,95 585,132 613,146" color={c("research")} />
            <Flow d="M535,236 C575,225 585,188 613,174" color={c("coder")} />
            <Flow d="M745,160 L793,160" color={c("reviewer")} />
            <Flow d="M925,160 L968,160" color={c("reporter")} />

            {/* patch loop */}
            <path
              d="M678,186 C676,262 566,300 508,272"
              fill="none"
              stroke="var(--coral)"
              strokeWidth={1.2}
              strokeDasharray="5 5"
              markerEnd="url(#arrowhead)"
            />
            <text x={598} y={292} fill="var(--coral)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.5}>
              PATCH ROUND ↺
            </text>
            <text x={352} y={42} fill="var(--mut)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.5}>
              ∥ FAN-OUT
            </text>
            <text x={545} y={42} fill="var(--mut)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.5}>
              FAN-IN ∇
            </text>

            <Node x={20} y={137} label="User" sub="operator request" color="var(--mut)" ghost />
            <Node x={195} y={137} label="Planner" sub="decompose · assign" color={c("planner")} />
            <Node x={405} y={57} label="Research" sub="evidence · memory" color={c("research")} />
            <Node x={405} y={217} label="Coder" sub="python · tests" color={c("coder")} />
            <Node x={615} y={137} label="Reviewer" sub="lint · score" color={c("reviewer")} />
            <Node x={795} y={137} label="Reporter" sub="report.md" color={c("reporter")} />
            <text x={947} y={145} fill="var(--mut)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.2} textAnchor="middle">
              FINAL
            </text>
            <text x={947} y={185} fill="var(--mut)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.2} textAnchor="middle">
              RESPONSE
            </text>
          </svg>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border border-line bg-panel px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mut">phase sequence</span>
          {[
            ["plan", c("planner")],
            ["approve", "var(--amber)"],
            ["exec ∥", "var(--c-research)"],
            ["review ↺", c("reviewer")],
            ["report", c("reporter")],
          ].map(([label, color], i, arr) => (
            <span key={label as string} className="flex items-center gap-6">
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/80">
                <span className="h-2 w-2 rounded-full" style={{ background: color as string }} />
                {label as string}
              </span>
              {i < arr.length - 1 && <span className="font-mono text-[11px] text-mut">→</span>}
            </span>
          ))}
          <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.16em] text-mut lg:inline">
            state flows through one shared memory store
          </span>
        </div>
      </Reveal>
    </section>
  );
}

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
        width={128}
        height={46}
        rx={3}
        fill={ghost ? "transparent" : "var(--panel)"}
        stroke={ghost ? "var(--line2)" : color}
        strokeDasharray={ghost ? "4 4" : undefined}
        strokeWidth={1.2}
      />
      {!ghost && <circle cx={x + 16} cy={y + 23} r={3.5} fill={color} />}
      <text
        x={x + (ghost ? 64 : 27)}
        y={y + 20}
        fill={ghost ? "var(--mut)" : "var(--ink)"}
        fontSize={12}
        fontFamily="Chakra Petch, sans-serif"
        fontWeight={700}
        textAnchor={ghost ? "middle" : "start"}
        letterSpacing={1}
      >
        {label.toUpperCase()}
      </text>
      <text
        x={x + (ghost ? 64 : 27)}
        y={y + 35}
        fill="var(--mut)"
        fontSize={7.2}
        fontFamily="IBM Plex Mono, monospace"
        textAnchor={ghost ? "middle" : "start"}
        letterSpacing={1.1}
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
    <section id="architecture" className="relative mx-auto max-w-[1560px] px-5 pb-20 pt-[7.5rem] md:px-8 md:pb-28 md:pt-[8rem]">
      <SectionHead
        no="01"
        title="Orchestration Map"
        desc="One topology, eight specialists. Two parallel fan-outs — research∥coder, then security∥devops — with a QA gate, a reviewer patch loop and a final report merge."
      />

      <Reveal className="mt-12">
        <div className="overflow-x-auto border border-line bg-panel p-4 md:p-8">
          <svg viewBox="0 0 1160 330" className="min-w-[880px]" role="img" aria-label="Agent workflow diagram">
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8" fill="none" stroke={EDGE} strokeWidth={1.2} />
              </marker>
            </defs>

            {/* main flows */}
            <Flow d="M148,165 L188,165" />
            <Flow d="M318,150 C342,124 350,104 366,88" color={c("research")} />
            <Flow d="M318,180 C342,206 350,226 366,242" color={c("coder")} />
            <Flow d="M496,88 C516,108 524,128 540,150" color={c("research")} />
            <Flow d="M496,242 C516,222 524,202 540,180" color={c("coder")} />
            <Flow d="M668,165 L700,165" color={c("qa")} />
            <Flow d="M828,150 C846,126 850,106 856,90" color={c("reviewer")} />
            <Flow d="M828,180 C846,204 850,224 856,240" color={c("reviewer")} />
            <Flow d="M984,90 C996,110 998,132 1002,150" color={c("security")} />
            <Flow d="M984,240 C996,220 998,198 1002,180" color={c("devops")} />
            <Flow d="M1128,165 L1152,165" color={c("reporter")} />

            {/* reviewer → coder patch loop */}
            <path
              d="M764,190 C760,292 520,316 448,272"
              fill="none"
              stroke="var(--coral)"
              strokeWidth={1.2}
              strokeDasharray="5 5"
              markerEnd="url(#arrowhead)"
            />
            <text x={600} y={306} fill="var(--coral)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.5}>
              PATCH ROUND ↺
            </text>
            <text x={330} y={42} fill="var(--mut)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.5}>
              FAN-OUT ∥
            </text>
            <text x={510} y={42} fill="var(--mut)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.5}>
              FAN-IN ∇
            </text>
            <text x={856} y={42} fill="var(--mut)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.5}>
              HARDEN ∥
            </text>

            {/* nodes */}
            <Node x={20} y={142} label="User" sub="operator request" color="var(--mut)" ghost />
            <Node x={190} y={142} label="Planner" sub="decompose · hf model" color={c("planner")} />
            <Node x={368} y={65} label="Research" sub="evidence · memory" color={c("research")} />
            <Node x={368} y={225} label="Coder" sub="python · tests" color={c("coder")} />
            <Node x={542} y={142} label="QA" sub="matrix · coverage" color={c("qa")} />
            <Node x={702} y={142} label="Reviewer" sub="lint · score 0–100" color={c("reviewer")} />
            <Node x={858} y={65} label="Security" sub="sast · osv cves" color={c("security")} />
            <Node x={858} y={225} label="DevOps" sub="docker · ci" color={c("devops")} />
            <Node x={1004} y={142} label="Reporter" sub="report.md + pdf" color={c("reporter")} />
            <text x={1146} y={150} fill="var(--mut)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.2} textAnchor="middle">
              FINAL
            </text>
            <text x={1146} y={190} fill="var(--mut)" fontSize={8} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.2} textAnchor="middle">
              RESPONSE
            </text>
          </svg>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border border-line bg-panel px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mut">phase sequence</span>
          {[
            ["plan", c("planner")],
            ["approve", "var(--amber)"],
            ["exec ∥", c("research")],
            ["qa", c("qa")],
            ["review ↺", c("reviewer")],
            ["harden ∥", c("security")],
            ["report", c("reporter")],
          ].map(([label, color], i, arr) => (
            <span key={label as string} className="flex items-center gap-5">
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

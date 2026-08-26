import { useState } from "react";
import { AGENTS, AGENT_ORDER } from "../lib/knowledge";
import type { AgentId } from "../lib/types";
import { Icon, Reveal, SectionHead } from "../lib/ui";

export default function DossiersSection() {
  const [sel, setSel] = useState<AgentId>("planner");
  const def = AGENTS[sel];

  return (
    <section id="agents" className="relative border-y border-line bg-panel/40">
      <div className="mx-auto max-w-[1560px] px-5 pb-20 pt-[7.5rem] md:px-8 md:pb-28 md:pt-[8rem]">
        <SectionHead
          no="02"
          title="Agent Dossiers"
          desc="Every specialist runs on one system prompt, a narrow tool belt and a written contract of what it reads and writes in shared memory."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-14">
          {/* index */}
          <Reveal>
            <div className="lg:sticky lg:top-[7.5rem]">
              <div className="border-t-2 border-line2">
                {AGENT_ORDER.map((id, i) => {
                  const a = AGENTS[id];
                  const active = id === sel;
                  return (
                    <button
                      key={id}
                      onClick={() => setSel(id)}
                      className={`group flex w-full items-center gap-4 border-b border-line px-3 py-4 text-left transition-all duration-200 ${
                        active ? "bg-panel2" : "hover:bg-panel"
                      }`}
                      style={{ borderLeft: `3px solid ${active ? a.color : "transparent"}` }}
                    >
                      <span className="font-mono text-[10px] text-mut">0{i + 1}</span>
                      <span
                        className="flex-1 font-display text-xl font-bold uppercase tracking-tight transition-colors"
                        style={{ color: active ? a.color : "var(--ink)" }}
                      >
                        {a.name}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full transition-all ${active ? "led-on" : "opacity-30 group-hover:opacity-70"}`}
                        style={{ background: a.color }}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-mut">
                specialization beats generalization — eight narrow agents out-debate one wide one
              </p>
            </div>
          </Reveal>

          {/* detail */}
          <Reveal delay={100}>
            <div key={sel} className="popin">
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <h3 className="font-display text-3xl font-bold uppercase tracking-tight" style={{ color: def.color }}>
                  {def.name}
                </h3>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mut">agent 0{AGENT_ORDER.indexOf(sel) + 1} of 08</p>
              </div>
              <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink/80">{def.role}</p>

              <div className="mt-7 border border-line bg-panel">
                <p className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-mut">
                  <Icon name="terminal" className="h-3.5 w-3.5" />
                  system prompt
                  <span className="ml-auto text-mut/60">{def.prompt.length} chars</span>
                </p>
                <pre
                  className="overflow-x-auto whitespace-pre-wrap px-5 py-4 font-mono text-[12px] leading-relaxed text-ink/85"
                  style={{ borderLeft: `3px solid ${def.color}` }}
                >
                  {def.prompt}
                </pre>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="border border-line bg-panel p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mut">responsibilities</p>
                  <ul className="mt-3 space-y-2">
                    {def.responsibilities.map((r) => (
                      <li key={r} className="flex gap-2.5 text-[13px] leading-snug text-ink/80">
                        <span style={{ color: def.color }}>▪</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-6">
                  <div className="border border-line bg-panel p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mut">tool belt</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {def.tools.map((t) => (
                        <span key={t} className="border border-line px-2.5 py-1 font-mono text-[11px] text-amber">
                          {t}()
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="border border-line bg-panel p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mut">memory contract</p>
                    <div className="mt-3 space-y-2.5">
                      <p className="font-mono text-[11px]">
                        <span className="text-mut">reads </span>
                        {def.reads.map((k) => (
                          <span key={k} className="mr-1.5 border border-line px-1.5 py-0.5 text-research">{k}</span>
                        ))}
                      </p>
                      <p className="font-mono text-[11px]">
                        <span className="text-mut">writes </span>
                        {def.writes.map((k) => (
                          <span key={k} className="mr-1.5 border border-line px-1.5 py-0.5 text-coder">{k}</span>
                        ))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 border border-line bg-panel px-5 py-3.5">
                <p className="font-mono text-[11px]">
                  <span className="mr-2 text-[9px] uppercase tracking-[0.2em] text-mut">typical output</span>
                  <span className="text-ink/85">{def.sample}</span>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

import { AgentId, AgentRuntime, MemoryEntry, StageLine, ToolCall } from "../lib/types";
import { AGENTS } from "../lib/knowledge";
import { Icon, MarkdownLite } from "../lib/ui";

interface PromptExecutionViewProps {
  agents: Record<AgentId, AgentRuntime>;
  stages: Record<AgentId, StageLine[]>;
  memory: MemoryEntry[];
  tools: ToolCall[];
}

export default function PromptExecutionView({ agents, stages, memory, tools }: PromptExecutionViewProps) {
  const activeAgents = Object.entries(agents).filter(([_, rt]) => rt.status !== "idle");
  
  return (
    <section id="prompts" className="relative mx-auto max-w-[1560px] px-5 pb-20 pt-[7.5rem] md:px-8 md:pb-28 md:pt-[8rem]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-t-2 border-line2 pt-5">
        <div>
          <p className="font-mono text-xs tracking-[0.28em] text-amber">/05</p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
            Prompt Execution
            <br />
            Trace<span className="blink text-amber">_</span>
          </h1>
        </div>
        <div className="max-w-sm space-y-3">
          <p className="font-body text-sm leading-relaxed text-mut">
            Real-time visualization of prompt construction, memory injection, tool calls, and agent outputs.
            Watch how each agent's prompt is assembled with context, tools, and constraints before execution.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut/70">
            loop engineering · iterative refinement · error recovery
          </p>
        </div>
      </div>

      {/* Active agents with prompt traces */}
      <div className="grid gap-5 lg:grid-cols-2">
        {activeAgents.map(([agentId, rt]) => {
          const agent = AGENTS[agentId as AgentId];
          const agentMemory = memory.filter((m) => m.author === agentId);
          const agentTools = tools.filter((t) => t.agent === agentId);
          const agentLines = stages[agentId as AgentId];
          
          return (
            <div key={agentId} className="border border-line bg-panel">
              {/* Agent header */}
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      rt.status === "thinking" ? "led-on" : rt.status === "working" ? "led-fast" : ""
                    }`}
                    style={{ background: agent.color }}
                  />
                  <span className="font-display text-sm font-bold uppercase tracking-[0.08em]" style={{ color: agent.color }}>
                    {agent.name}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-mut">
                    {rt.status}
                  </span>
                </div>
                {rt.model && (
                  <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-mut">
                    {rt.model}
                  </span>
                )}
              </div>

              {/* Prompt construction */}
              <div className="border-b border-line px-4 py-3">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mut">
                  system prompt · {agent.prompt.length} chars
                </p>
                <div className="max-h-[120px] overflow-y-auto border-l-2 border-line bg-bg px-3 py-2 font-mono text-[10px] leading-relaxed text-ink/80">
                  <MarkdownLite md={agent.prompt.slice(0, 400) + (agent.prompt.length > 400 ? "…" : "")} />
                </div>
              </div>

              {/* Memory context */}
              {agentMemory.length > 0 && (
                <div className="border-b border-line px-4 py-3">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mut">
                    memory context · {agentMemory.length} entries
                  </p>
                  <div className="space-y-1.5">
                    {agentMemory.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-start gap-2 font-mono text-[10px]">
                        <span className="shrink-0 text-amber">▪</span>
                        <span className="min-w-0 flex-1">
                          <span className="text-research">{m.key}</span>
                          <span className="text-mut"> = </span>
                          <span className="text-ink/80">{m.value}</span>
                        </span>
                      </div>
                    ))}
                    {agentMemory.length > 5 && (
                      <p className="font-mono text-[9px] text-mut/60">
                        +{agentMemory.length - 5} more entries
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tool calls */}
              {agentTools.length > 0 && (
                <div className="border-b border-line px-4 py-3">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mut">
                    tool calls · {agentTools.length}
                  </p>
                  <div className="space-y-1.5">
                    {agentTools.slice(0, 4).map((t) => (
                      <div key={t.id} className="flex items-start gap-2 font-mono text-[10px]">
                        <span className={`shrink-0 ${t.ok ? "text-coder" : "text-coral"}`}>
                          {t.ok ? "✓" : "✗"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-amber">{t.tool}</span>
                          <span className="text-mut">({t.arg.slice(0, 40)}{t.arg.length > 40 ? "…" : ""})</span>
                          <span className="ml-2 text-mut/60">{t.ms}ms</span>
                        </span>
                      </div>
                    ))}
                    {agentTools.length > 4 && (
                      <p className="font-mono text-[9px] text-mut/60">
                        +{agentTools.length - 4} more calls
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Execution trace */}
              {agentLines.length > 0 && (
                <div className="px-4 py-3">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mut">
                    execution trace · {agentLines.length} lines
                  </p>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {agentLines.slice(-10).map((line) => (
                      <div key={line.id} className="flex items-start gap-2 font-mono text-[10px]">
                        <span className={`shrink-0 ${
                          line.kind === "good" ? "text-coder" :
                          line.kind === "warn" ? "text-coral" :
                          line.kind === "data" ? "text-research" :
                          "text-mut"
                        }`}>
                          {line.kind === "good" ? "✓" : line.kind === "warn" ? "!" : line.kind === "data" ? "▪" : "›"}
                        </span>
                        <span className="min-w-0 flex-1 text-ink/80">{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status footer */}
              <div className="border-t border-line px-4 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-mut">
                  {rt.meta || "awaiting execution"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {activeAgents.length === 0 && (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 border-2 border-dashed border-line px-6 py-16 text-center">
          <p className="stroke-dim font-display text-3xl font-bold uppercase tracking-tight sm:text-5xl">
            No active execution
          </p>
          <p className="max-w-md font-mono text-xs leading-relaxed text-mut">
            Run a task from the Console to see real-time prompt construction, memory injection,
            tool calls, and execution traces for each agent.
          </p>
        </div>
      )}
    </section>
  );
}

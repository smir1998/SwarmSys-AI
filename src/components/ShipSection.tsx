import { useState } from "react";
import { TOOL_REGISTRY } from "../lib/knowledge";
import { Icon, Reveal, SectionHead } from "../lib/ui";

const TREE = `multi-agent-ai-system/
│
├── agents/               # one module per specialist
│   ├── planner.py        # decompose → Subtask[]
│   ├── researcher.py     # web_search + knowledge_base
│   ├── coder.py          # python_exec sandbox
│   ├── reviewer.py       # lint + tests → 0–100 score
│   └── reporter.py       # merge → report.md
│
├── tools/                # search, calc, sql, vector, files
├── memory/               # short-term dict + long-term store
├── workflows/
│   └── graph.py          # LangGraph state machine
│
├── app.py                # FastAPI · POST /run {task}
├── requirements.txt
└── README.md`;

const QUICKSTART = `# workflows/graph.py — this console, as a real service
from langgraph.graph import StateGraph, END
from agents import planner, researcher, coder, reviewer, reporter

g = StateGraph(RunState)
g.add_node("planner", planner.run)
g.add_node("research", researcher.run)
g.add_node("coder", coder.run)
g.add_node("reviewer", reviewer.run)
g.add_node("reporter", reporter.run)

g.set_entry_point("planner")
g.add_edge("planner", "research")
g.add_edge("planner", "coder")          # fan-out: parallel
g.add_edge("research", "reviewer")
g.add_edge("coder", "reviewer")         # fan-in
g.add_conditional_edges(
    "reviewer", reviewer.route,
    {"patch": "coder", "ship": "reporter"},
)
g.add_edge("reporter", END)

app = g.compile()   # serve via FastAPI: POST /run {"task": ...}`;

const FRAMEWORKS = ["LangGraph", "LangChain", "CrewAI", "AutoGen", "FastAPI", "Chroma", "pgvector", "Render", "Railway"];

export default function ShipSection() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(QUICKSTART);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="ship" className="relative mx-auto max-w-[1560px] px-5 py-20 md:px-8 md:py-28">
      <SectionHead
        no="03"
        title="Ship It For Real"
        desc="This console mirrors a LangGraph node graph one-to-one. Swap the deterministic specialists for LLM nodes and the topology, memory contract and gates all hold."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
        <Reveal>
          <div className="h-full border border-line bg-panel">
            <p className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-mut">
              <Icon name="nodes" className="h-3.5 w-3.5 text-amber" />
              project structure
            </p>
            <pre className="overflow-x-auto px-5 py-4 font-mono text-[11.5px] leading-relaxed text-ink/85">{TREE}</pre>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex h-full flex-col border border-line bg-panel">
            <p className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-mut">
                <Icon name="zap" className="h-3.5 w-3.5 text-coder" />
                graph.py — the same five nodes
              </span>
              <button
                onClick={copy}
                className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] transition-all ${
                  copied ? "border-coder text-coder" : "border-line text-mut hover:border-amber hover:text-amber"
                }`}
              >
                <Icon name={copied ? "check" : "copy"} className="h-3 w-3" />
                {copied ? "copied" : "copy"}
              </button>
            </p>
            <pre className="flex-1 overflow-x-auto px-5 py-4 font-mono text-[11.5px] leading-relaxed text-coder/90">
              {QUICKSTART}
            </pre>
            <p className="border-t border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-mut">
              pip install langgraph langchain-openai fastapi uvicorn chromadb
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={160}>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
          <div className="border border-line bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mut">tool registry · 7 external tools</p>
            <div className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {TOOL_REGISTRY.map((t) => (
                <p key={t.name} className="font-mono text-[11px] leading-relaxed">
                  <span className="text-amber">{t.name}</span>
                  <span className="text-mut"> — {t.desc}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-5 border border-line bg-panel p-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mut">stack &amp; deployment targets</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {FRAMEWORKS.map((f) => (
                  <span
                    key={f}
                    className="border border-line px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink/80 transition-all duration-200 hover:border-amber hover:text-amber"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <p className="border-t border-line pt-4 font-body text-[13px] leading-relaxed text-mut">
              Deterministic specialists make the workflow debuggable without an API key. The day you
              wire in a model, each agent's <span className="font-mono text-[12px] text-research">system prompt</span>{" "}
              (see dossiers above) and its <span className="font-mono text-[12px] text-coder">memory contract</span>{" "}
              carry over unchanged.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

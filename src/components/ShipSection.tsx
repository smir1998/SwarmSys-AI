import { useState } from "react";
import { DEPLOY_TARGETS, SHIP_CHECKLIST, SOURCE_FILE_COUNT } from "../lib/shipkit";
// heavy raw-file archive is imported lazily in grab() below
import { loadShipCheck, saveShipCheck } from "../lib/store";
import { Icon, Reveal, SectionHead } from "../lib/ui";

const TREE = `multi-agent-ai-system/
│
├── agents/               # one module per specialist
│   ├── planner.py        # decompose → Subtask[]
│   ├── researcher.py     # web_search + knowledge_base
│   ├── coder.py          # python_exec sandbox
│   ├── qa.py             # test matrix + coverage
│   ├── reviewer.py       # lint + tests → 0–100 score
│   ├── security.py       # SAST + OSV.dev CVE feed
│   ├── devops.py         # Dockerfile + CI + rollback
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
from agents import planner, researcher, coder, qa, reviewer, \\
                   security, devops, reporter

g = StateGraph(RunState)
for name, mod in [("planner", planner), ("research", researcher),
                  ("coder", coder), ("qa", qa), ("reviewer", reviewer),
                  ("security", security), ("devops", devops),
                  ("reporter", reporter)]:
    g.add_node(name, mod.run)

g.set_entry_point("planner")
g.add_edge("planner", "research")
g.add_edge("planner", "coder")          # fan-out ∥ (parallel)
g.add_edge("research", "qa")
g.add_edge("coder", "qa")               # fan-in → quality gate
g.add_edge("qa", "reviewer")
g.add_conditional_edges(
    "reviewer", reviewer.route,
    {"patch": "coder", "ship": "security"},
)
g.add_edge("reviewer", "devops")        # security ∥ devops (harden)
g.add_edge("security", "reporter")
g.add_edge("devops", "reporter")        # fan-in → final merge
g.add_edge("reporter", END)

app = g.compile()   # serve via FastAPI: POST /run {"task": ...}`;

const FRAMEWORKS = ["LangGraph", "LangChain", "CrewAI", "AutoGen", "FastAPI", "Hugging Face", "Chroma", "pgvector", "Render", "Railway"];

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1300);
    } catch {
      setCopied(null);
    }
  };
  return { copied, copy };
}

export default function ShipSection() {
  const { copied, copy } = useCopy();
  const [done, setDone] = useState<string[]>(() => loadShipCheck());
  const [zipping, setZipping] = useState<"source" | "pack" | null>(null);
  const progress = Math.round((done.length / SHIP_CHECKLIST.length) * 100);
  const shipped = done.length === SHIP_CHECKLIST.length;

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveShipCheck(next);
      return next;
    });
  };

  const grab = async (kind: "source" | "pack") => {
    setZipping(kind);
    try {
      const { downloadSource, downloadDeployPack } = await import("../lib/archive");
      if (kind === "source") await downloadSource();
      else await downloadDeployPack();
    } finally {
      setZipping(null);
    }
  };

  return (
    <section id="ship" className="relative mx-auto max-w-[1560px] px-5 pb-20 pt-[7.5rem] md:px-8 md:pb-28 md:pt-[8rem]">
      <SectionHead
        no="03"
        title="Ship It For Real"
        desc="Not a wall of text — an executable exit ramp. Download the complete source archive, take the deploy manifests, follow the checklist, and push the build to a live URL."
      />

      {/* ————— ship actions ————— */}
      <Reveal className="mt-12">
        <div
          className={`grid gap-px overflow-hidden border-2 bg-line md:grid-cols-3 ${shipped ? "border-coder/60" : "border-line2"}`}
        >
          <div className="flex flex-col justify-between gap-4 bg-panel p-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mut">01 · take the code</p>
              <h3 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">Source archive</h3>
              <p className="mt-2 font-body text-[13px] leading-relaxed text-mut">
                Every file of this project — {SOURCE_FILE_COUNT} source files, configs, README — zipped
                client-side from the live bundle. Unzip, <span className="font-mono text-[12px] text-coder">npm install</span>,{" "}
                <span className="font-mono text-[12px] text-coder">npm run dev</span>.
              </p>
            </div>
            <button
              onClick={() => grab("source")}
              disabled={!!zipping}
              className="flex h-12 items-center justify-center gap-2.5 bg-amber font-display text-sm font-bold uppercase tracking-[0.1em] text-[#0a0f12] transition-all duration-200 hover:bg-ink disabled:opacity-40"
            >
              <Icon name="download" className="h-4 w-4" />
              {zipping === "source" ? "Zipping…" : "Download source .zip"}
            </button>
          </div>

          <div className="flex flex-col justify-between gap-4 bg-panel p-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mut">02 · take the manifests</p>
              <h3 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">Deploy pack</h3>
              <p className="mt-2 font-body text-[13px] leading-relaxed text-mut">
                vercel.json · netlify.toml · render.yaml · Dockerfile + nginx.conf · Dockerfile.api +
                requirements.txt for the LangGraph port — plus a DEPLOY.md guide.
              </p>
            </div>
            <button
              onClick={() => grab("pack")}
              disabled={!!zipping}
              className="flex h-12 items-center justify-center gap-2.5 border-2 border-amber font-display text-sm font-bold uppercase tracking-[0.1em] text-amber transition-all duration-200 hover:bg-amber hover:text-[#0a0f12] disabled:opacity-40"
            >
              <Icon name="download" className="h-4 w-4" />
              {zipping === "pack" ? "Zipping…" : "Download deploy pack"}
            </button>
          </div>

          {/* checklist */}
          <div className={`bg-panel p-6 ${shipped ? "shadow-[inset_0_0_60px_-30px_var(--c-coder)]" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mut">03 · the checklist</p>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.16em] ${shipped ? "text-coder" : "text-amber"}`}
              >
                {shipped ? "ship it ✓" : `${done.length}/${SHIP_CHECKLIST.length}`}
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-line">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${progress}%`, background: shipped ? "var(--c-coder)" : "var(--amber)" }}
              />
            </div>
            <ul className="mt-4 space-y-1.5">
              {SHIP_CHECKLIST.map((step, i) => {
                const on = done.includes(step.id);
                return (
                  <li key={step.id}>
                    <button
                      onClick={() => toggle(step.id)}
                      className="group flex w-full items-start gap-2.5 text-left"
                      title={step.detail}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition-all ${
                          on ? "border-coder bg-coder text-bg" : "border-line2 group-hover:border-amber"
                        }`}
                      >
                        {on && <Icon name="check" className="h-2.5 w-2.5" />}
                      </span>
                      <span
                        className={`font-mono text-[11px] leading-snug transition-colors ${
                          on ? "text-mut line-through decoration-coder/50" : "text-ink/85 group-hover:text-ink"
                        }`}
                      >
                        <span className="mr-1.5 text-mut/60">{i + 1}</span>
                        {step.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-mut/70">
              persisted to this browser · hover a step for detail
            </p>
          </div>
        </div>
      </Reveal>

      {/* ————— deploy targets ————— */}
      <Reveal delay={100}>
        <div className="mt-8">
          <p className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-mut">
            <Icon name="arrow" className="h-3.5 w-3.5 text-amber" />
            deploy targets · commands ready to copy
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {DEPLOY_TARGETS.map((t) => (
              <div key={t.id} className="group border border-line bg-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-line2">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <span className="font-display text-sm font-bold uppercase tracking-[0.06em] text-ink group-hover:text-amber">
                    {t.label}
                  </span>
                  <span className="led-on h-1.5 w-1.5 rounded-full bg-line2 transition-colors group-hover:bg-amber" />
                </div>
                <div className="space-y-1.5 px-4 py-3">
                  {t.commands.map((c, i) => {
                    const key = `${t.id}-${i}`;
                    return (
                      <button
                        key={i}
                        onClick={() => !c.startsWith("#") && copy(key, c)}
                        disabled={c.startsWith("#")}
                        className={`flex w-full items-center justify-between gap-3 border border-line bg-bg px-3 py-2 text-left font-mono text-[11px] transition-colors ${
                          c.startsWith("#") ? "cursor-default text-mut" : "text-coder/90 hover:border-coder/50"
                        }`}
                      >
                        <span className="truncate">
                          <span className="mr-2 text-amber">❯</span>
                          {c.startsWith("# ") ? c.slice(2) : c}
                        </span>
                        {!c.startsWith("#") && (
                          <Icon
                            name={copied === key ? "check" : "copy"}
                            className={`h-3.5 w-3.5 shrink-0 ${copied === key ? "text-coder" : "text-mut"}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="px-4 pb-3 font-mono text-[9.5px] leading-relaxed text-mut">{t.note}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ————— reference: tree + graph.py ————— */}
      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
        <Reveal>
          <div className="h-full border border-line bg-panel">
            <p className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-mut">
              <Icon name="nodes" className="h-3.5 w-3.5 text-amber" />
              production project structure
            </p>
            <pre className="overflow-x-auto px-5 py-4 font-mono text-[11.5px] leading-relaxed text-ink/85">{TREE}</pre>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex h-full flex-col border border-line bg-panel">
            <p className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-mut">
                <Icon name="zap" className="h-3.5 w-3.5 text-coder" />
                graph.py — the same eight nodes
              </span>
              <button
                onClick={() => copy("graph", QUICKSTART)}
                className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] transition-all ${
                  copied === "graph" ? "border-coder text-coder" : "border-line text-mut hover:border-amber hover:text-amber"
                }`}
              >
                <Icon name={copied === "graph" ? "check" : "copy"} className="h-3 w-3" />
                {copied === "graph" ? "copied" : "copy"}
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

      {/* ————— registry + stack ————— */}
      <Reveal delay={140}>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
          <div className="border border-line bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mut">tool registry · 11 tools the agents can call</p>
            <div className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {[
                ["web_search", "live Wikipedia search"],
                ["github_repos", "live prior-art scan"],
                ["hf_registry", "HF hub metadata"],
                ["osv_scan", "OSV.dev CVE feed"],
                ["knowledge_base", "curated facts"],
                ["python_exec", "sandboxed interpreter"],
                ["sql_query", "embedded ledger DB"],
                ["code_lint", "static analysis"],
                ["vector_db", "similarity retrieval"],
                ["file_io", "workspace filesystem"],
                ["pdf_export", "client-side writer"],
              ].map(([name, desc]) => (
                <p key={name} className="font-mono text-[11px] leading-relaxed">
                  <span className="text-amber">{name}</span>
                  <span className="text-mut"> — {desc}</span>
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
              The console you're using is the shipped artifact: a static build with no backend. The day
              you wire in real models, each agent's <span className="font-mono text-[12px] text-research">system prompt</span>{" "}
              and its <span className="font-mono text-[12px] text-coder">memory contract</span> carry over unchanged —
              only the eight node functions gain an LLM call.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

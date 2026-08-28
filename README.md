# SwarmSys AI

> 🚀 **Live deployment:** [https://your-username.github.io/swarmsys-ai/](https://your-username.github.io/swarmsys-ai/)
>
> _Shipped by GitHub Actions on every push to `main` — swap in your handle after the first green run._

**A multi-agent AI system that runs entirely in your browser.**

Eight specialized agents decompose, research, build, test, review, harden and document a task end-to-end —
coordinated through one shared memory store, with tool calls, live web evidence, a role-allocated Hugging
Face model stack, a human-approval gate, a reviewer patch loop and an autonomous scheduler. No API keys, no backend,
no setup: it ships as a single static build.

The specialists are deterministic by design — the orchestration layer (topology, memory contracts, gates,
tools) is the point, and every prompt and contract is written to carry over unchanged when you swap in
real LLM nodes.

---

## The topology

```
User request
     │
     ▼
┌─────────┐     fan-out ∥     ┌──────────┐
│ Planner │ ────────────────► │ Research │ ──┐
└─────────┘   (human gate)    └──────────┘   │  fan-in
     ▲                          ┌────────┐   ▼
     │ patch (revise scope)     │ Coder  │ ┌────┐
     │                          └────────┘ │ QA │
     │                                     └────┘
     │                                       │ matrix green
     │                                       ▼
     │                                 ┌──────────┐   score < 85 → coder ↺
     │                                 │ Reviewer │ ◄────────────────────
     │                                 └──────────┘
     │                                       │ cleared
     │                  harden ∥       ┌─────┴─────┐
     │                                 ▼           ▼
     │                            ┌──────────┐ ┌────────┐
     └─────────────────────────── │ Security │ │ DevOps │
                                  └──────────┘ └────────┘
                                       │           │
                                       └─────┬─────┘
                                             ▼
                                       ┌──────────┐
                                       │ Reporter │ → report.md + PDF
                                       └──────────┘
```

## The eight agents

| Agent | Job | Writes to shared memory |
|-------|-----|--------------------------|
| **Planner** | Understands the goal, decomposes into subtasks, assigns owners **and per-agent models** | `plan.subtasks`, `agents.models`, `inference.model` |
| **Research** | Live web + prior art + datasets, sealed as memory entries | `research.stack`, `research.metrics`, `research.live.*` |
| **Coder** | Production-ready Python, honors the locked research contract | `code.artifact`, `code.tests` |
| **QA** | Unit/edge matrix, coverage, mutation score | `qa.coverage`, `qa.edge_cases` |
| **Reviewer** | Lints, scores 0–100, gates the ship, one patch round below 85 | `review.score`, `review.flags` |
| **Security** | SAST pass + live OSV.dev CVE feed; critical findings block | `security.findings`, `security.verdict` |
| **DevOps** | Dockerfile, CI stages, rollback contract | `deploy.dockerfile`, `deploy.ci`, `deploy.rollback` |
| **Reporter** | Merges everything into an 11-section report + typeset PDF | `report.md` |

## Features

**Core orchestration** — parallel fan-outs (`research ∥ coder`, then `security ∥ devops`), one shared
memory store that every agent reads and writes, 11 callable tools, a human-approval gate after planning
(with *revise scope* that re-plans tighter), a reviewer patch loop, and line-by-line streamed agent output.

**Advanced tier**

- **Live API integrations** — Wikipedia, GitHub, the Hugging Face hub and the OSV.dev advisory feed, all
  CORS-friendly, with graceful offline fallbacks behind the `live web` toggle
- **Hugging Face model stack** — eight role-tagged hub models (general / code / reasoning / edge, incl.
  Llama 3.3 70B, DeepSeek R1 70B, Qwen2.5-Coder 32B). The **planner allocates a role-matched specialist
  to every agent** — reasoning models plan and review, code models build and audit — plus fixed
  task-specialized models: BGE-M3 embeddings, BGE Reranker v2, BART-Large-CNN summarization and
  DistilBERT-SST2 classification. The hub verifies each model's downloads/likes live, quality factors
  shape review scoring, and speed factors drive code-streaming pace
- **Embedded SQL engine** — `SELECT … WHERE … ORDER BY … LIMIT` over a seeded ledger DB
- **Report exports** — PDF typeset client-side (jsPDF, lazy-loaded) and raw markdown, both served through
  an in-app **Report Viewer** with inline preview, Save file, Copy and a New-tab fallback
- **Notifications** — in-console toast stream plus opt-in browser push
- **Autonomous scheduler** — recurring tasks (5–60 min cadence) that auto-execute full runs, gate bypassed
- **Multi-operator workspace** — operator seats with isolated run ledgers and long-term memory
- **Long-term memory** — user preferences persist per operator and bias the planner on repeat domains

## The console

A four-panel interface — toggle horizontally, never scroll past everything:

| Panel | Contents |
|-------|----------|
| **01 Console** | task input, six preset cases, role-tagged HF model selector, approval gate, live pipeline with per-agent model tags, memory/tools/ledger rails, scheduler |
| **02 Architecture** | the animated orchestration DAG |
| **03 Agents** | system prompts, tool belts and memory contracts for all eight specialists |
| **04 Ship It** | source archive download, deploy pack, per-target commands, ship checklist, LangGraph port |

Keyboard: `1`–`4` switch panels. Toggles: **auto-approve** (skip the gate), **live web** (real API evidence).

**Preset cases** — six predefined configurations bundle the task, the Hugging Face model and the swarm
policy into one click: *Spam sweep* (Φ-3.5 edge, gate bypassed), *Support bot* (Qwen Coder 7B, human gate),
*RAG audit* (DeepSeek R1 70B flagship stack, full review), *Sentiment board* (Llama 3.3 70B, auto-approved),
*News crawl* (Mistral, offline), *Demand forecast* (Llama 3.1 8B, offline). Each maps to a curated task domain with real
research notes and production-grade Python; anything else routes to a generic fallback domain.

## Live deployment

| | |
|---|---|
| 🔗 **URL** | [https://your-username.github.io/swarmsys-ai/](https://your-username.github.io/swarmsys-ai/) — GitHub Pages |
| 🤖 **Pipeline** | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — builds and publishes on every push to `main` |
| 📦 **Build** | `npm ci && npm run build -- --base=./` → static `dist/` (zero server, zero keys) |
| ⚡ **Deploy** | `git push origin main` — Actions does the rest |
| 🗂 **Manifests** | `vercel.json` · `netlify.toml` · `render.yaml` · `Dockerfile` + `nginx.conf` — downloadable from the in-app **Ship It** panel |

```bash
# GitHub Actions is the primary pipeline — zero commands after the first push
git push origin main                       # → https://<your-username>.github.io/swarmsys-ai/

# alternatives — after npm run build
vercel --prod                              # → https://<project>.vercel.app
npx netlify-cli deploy --prod --dir=dist   # → https://<site>.netlify.app
docker build -t swarmsys-ai . && docker run -d -p 8080:80 swarmsys-ai  # → http://localhost:8080
```

> After your first green run, replace `<your-username>` above (and in the banner at the top of this file)
> with your real handle. The **Ship It → checklist** inside the app tracks this step.

## Deploy via GitHub Actions

The repository ships a zero-config Pages pipeline: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Create a GitHub repository and push this project (`git add -A && git commit && git push origin main`).
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. Done — every push builds and publishes to `https://<your-username>.github.io/swarmsys-ai/`.

The workflow runs on pushes to `main` and on manual dispatch: install with cached deps → build with
`--base=./` (relative asset paths, Pages-safe) → upload artifact → deploy with zero-downtime replacement.
It ships inside the downloadable source archive too, so the zip from **Ship It** deploys as-is.

```markdown
![deploy](https://github.com/<your-username>/swarmsys-ai/actions/workflows/deploy.yml/badge.svg)
```

## Run it locally

```bash
npm install
npm run dev       # local console
npm run build     # static production build in dist/
npm run typecheck # strict TypeScript pass
```

**Stack:** React 19 · TypeScript 5.9 (strict) · Vite 6 · Tailwind CSS 4 · jsPDF + jszip (both code-split
and lazy-loaded). Chakra Petch / IBM Plex type pairing. Everything else is hand-rolled — the orchestration
engine, the SQL engine, the markdown renderer, the PDF typesetter, the deploy tooling.

`npm audit`: **0 vulnerabilities.** Heavy chunks (PDF writer, source archive) load only on demand.

## Project structure

```
.
├── .github/workflows/deploy.yml # CI: build → GitHub Pages on every push to main
├── index.html                   # shell: fonts, meta, SVG favicon
├── package.json · tsconfig.json · vite.config.js
└── src/
    ├── App.tsx                  # panel switching, run lifecycle, operators, scheduler, exports
    ├── components/
    │   ├── TopBar.tsx           # status, clock, notify, operator seats, panel rail
    │   ├── TaskConsole.tsx      # input, presets, HF model selector, toggles
    │   ├── Pipeline.tsx         # 8-stage streaming board + approval gate + final response
    │   ├── AgentRoster.tsx      # live per-agent status rail
    │   ├── MemoryPanel.tsx      # shared memory / tool calls / run ledger tabs
    │   ├── SchedulerPanel.tsx   # autonomous recurring runs
    │   ├── ReportViewer.tsx     # PDF/markdown preview modal with save & copy
    │   ├── ArchitectureSection.tsx # animated DAG (panel 02)
    │   ├── DossiersSection.tsx  # agent prompts & contracts (panel 03)
    │   ├── ShipSection.tsx      # downloads, deploy targets, checklist, LangGraph port (panel 04)
    │   └── NotifyToasts.tsx     # toast stream + browser push
    └── lib/
        ├── engine.ts            # the Orchestrator — gates, fan-outs, patch loop, report
        ├── knowledge.ts         # agent registry, 7 domains, 8 HF models + 4 specialists, 6 presets, 11 tools
        ├── web.ts               # live Wikipedia / GitHub / HF hub / OSV.dev clients
        ├── sqlite.ts            # embedded SQL engine
        ├── pdf.ts               # client-side report typesetting
        ├── shipkit.ts           # deploy manifests, targets, ship checklist
        ├── archive.ts           # lazy source-archive builder (?raw + jszip, 31 files)
        ├── store.ts             # operator-scoped guarded storage (ledger, LTM, schedules)
        ├── types.ts             # shared contracts (agents, phases, records, views)
        └── ui.tsx               # Reveal, MarkdownLite, icon set, motion hooks
```

## Port it to production

The console mirrors a LangGraph state graph one-to-one — the `04 Ship It` panel contains the working
skeleton:

```python
g.add_edge("planner", "research")
g.add_edge("planner", "coder")          # fan-out ∥
g.add_edge("research", "qa"); g.add_edge("coder", "qa")
g.add_conditional_edges("reviewer", reviewer.route,
                        {"patch": "coder", "ship": "security"})
g.add_edge("security", "reporter"); g.add_edge("devops", "reporter")
```

Swap the deterministic specialists for LLM nodes; the prompts, memory contracts and gates carry over.

## Status & known items

| | |
|---|---|
| ✅ Complete | 8-agent engine · presets · HF models · live web/OSV · SQL · exports · scheduler · operators · LTM · mobile · a11y |
| ✅ Verified | build green · typecheck clean · 0 audit findings · no debug output · reduced-motion honored |
| ⚠️ Known | `@types/uuid` is deprecated & unused — `npm uninstall @types/uuid` removes it (requires a direct manifest edit) |
| ⚠️ Known | Vite held at 6.x by environment policy; Vite 7 needs Node ≥ 20.19 |

## License

MIT © 2026 Syed Mohammad Irtiza Rizvi — see [LICENSE](LICENSE).

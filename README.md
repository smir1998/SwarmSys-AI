# SwarmSys AI

> 🚀 **Live deployment:** [https://smir1998.github.io/swarmsys-ai/](https://smir1998.github.io/swarmsys-ai/)
> — shipped by **GitHub Actions** on every push to `main`.
>
> _Replace `<your-username>` with your GitHub handle after the first green run — see [Deploy via GitHub Actions](#deploy-via-github-actions)._

**A multi-agent AI system that runs entirely in your browser.**

Eight specialized agents decompose, research, build, test, review, harden and document a task end-to-end — coordinated through one shared memory store,with tool calls, live web evidence, a human-approval gate, a reviewer patch loop and an autonomous scheduler. No API keys, no backend, no setup: it ships as a single static build.

The specialists are deterministic by design — the orchestration layer (topology, memory contracts, gates, tools) is the point, and every prompt and contract is written to carry over unchanged when you swap in real LLM nodes.

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
     │   patch round ↺  ┌──────────┐   score < 85
     └───────────────── │ Reviewer │ ◄────────┘
                        └──────────┘   score ≥ 85
                             │  fan-out ∥  ┌──────────┐
                             ├───────────► │ Security │ ──┐
                             │             └──────────┘   │ fan-in
                             │             ┌──────────┐   ▼
                             └───────────► │  DevOps  │ ┌──────────┐
                                           └──────────┘ │ Reporter │──► report.md + PDF
                                                        └──────────┘
```

Phases: `plan → approve → exec ∥ → qa → review ↺ → harden ∥ → report`

## The eight agents

| # | Agent | Job | Writes to shared memory |
|---|-------|-----|-------------------------|
| A1| **Planner** | Parses the goal, grounds it in long-term preferences, decomposes into subtasks, validates the inference model against the HF hub | `plan.subtasks`, `inference.model` |
| A2| **Research** | Collects evidence — live Wikipedia/GitHub hits, datasets, metrics — and seals it into memory | `research.stack`, `research.metrics`, `research.live.sources` |
| A3| **Coder** | Generates typed, commented Python with tests; honors the locked research contract; queries the embedded SQL ledger | `code.artifact`, `code.tests` |
| A4| **QA** | Runs the unit/edge/property matrix, measures coverage, mutation-tests | `qa.coverage`, `qa.edge_cases` |
| A5| **Reviewer** | Lints, tests, scores 0–100. Below 85 it hands the Coder one precise patch list | `review.score`, `review.flags` |
| A6| **Security** | SAST for secrets/injection + live OSV.dev CVE scan; critical findings block the ship | `security.verdict`, `security.findings` |
| A7| **DevOps** | Dockerfile, CI workflow, rollback plan — the deployment contract | `deploy.contract` |
| A8| **Reporter** | Merges every stage into the final report; exports Markdown and a typeset PDF | `report.md` |

## Features

**Core orchestration**
- Shared short-term memory — every agent reads and writes `key = value` entries, visible live in the memory rail
- Tool calling — 11 registered tools with args, results and latency logged per invocation
- Human-approval gate — execution pauses after planning; approve it or send the planner back with a tighter scope
- Reviewer patch loop — one revision round when quality falls below the gate
- Streaming stage output — line-by-line agent transcripts, including the code itself

**Advanced tier**
- **Live web research** — real Wikipedia and GitHub REST API calls (no keys, CORS-enabled, graceful offline fallback)
- **Hugging Face models** — five selectable hub models (Llama 3.1 8B, Qwen2.5 Coder, DeepSeek R1, Mistral 7B, Phi-3.5 mini); the Planner verifies the pick against the live hub API and the Reviewer applies its quality factor to the score
- **SQL database querying** — an embedded engine answers real `SELECT … WHERE … ORDER BY … LIMIT` against the seeded ledger database mid-run
- **Security auditing** — live OSV.dev advisory feed for the locked dependencies
- **PDF generation** — one click typesets the report into a branded A4 document, fully client-side (jsPDF, lazy-loaded)
- **Notifications** — in-console toast stream plus opt-in browser push for completions
- **Autonomous scheduling** — recurring tasks trigger full swarm runs on their own cadence (gate bypassed by policy, ledger tagged `· auto`)
- **Multi-operator workspace** — operator seats in the top bar, each with its own run ledger and long-term memory
- **Long-term memory** — persisted preferences (stack, domain history) bias the Planner on repeat domains

## The console

A four-panel interface — toggle horizontally, never scroll past everything:

| Panel | Contents |
|-------|----------|
| **01 Console** | Task input, model selector, toggle switches, 8-agent roster, live pipeline, memory/tools/ledger rail, scheduler |
| **02 Architecture** | The animated 8-node orchestration DAG with both fan-outs and the patch loop |
| **03 Agents** | Dossiers: system prompt, responsibilities, tool belt and memory contract for each specialist |
| **04 Ship it** | A working exit ramp: download the complete source `.zip` (30 files, buildable as-is) and the deploy pack (vercel.json, netlify.toml, render.yaml, Dockerfile + nginx, Dockerfile.api + requirements), copy-ready deploy commands for six targets, a persisted ship checklist, plus the LangGraph `graph.py` port |

Keyboard: `1`–`4` switch panels. Toggles: **auto-approve** (skip the gate), **live web** (real API evidence).

**Preset cases** — six predefined configurations bundle the task, the Hugging Face model and the swarm
policy into one click: *Spam sweep* (Φ-3.5, gate bypassed), *Support bot* (Qwen Coder, human gate),
*RAG audit* (DeepSeek R1, full review), *Sentiment board* (Llama, auto-approved), *News crawl*
(Mistral, offline), *Demand forecast* (Llama, offline). Each maps to a curated task domain with real
research notes and production-grade Python; anything else routes to a generic fallback domain.

## Run it

```bash
npm install
npm run dev       # local console
npm run build     # static production build in dist/
```

Stack: **React + TypeScript + Vite + Tailwind v4**, Chakra Petch / IBM Plex type pairing.
Zero runtime dependencies beyond jsPDF (code-split) — everything else is hand-rolled, including the SQL
engine, the markdown renderer and the orchestration core.

## Live deployment

| | |
|---|---|
| 🔗 **URL** | [https://your-username.github.io/swarmsys-ai/](https://your-username.github.io/swarmsys-ai/) — GitHub Pages |
| 🤖 **Pipeline** | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — builds and publishes on every push |
| 📦 **Build** | `npm ci && npm run build -- --base=./` → static `dist/` (zero server, zero keys) |
| ⚡ **Deploy** | `git push origin main` — Actions does the rest |
| 🗂 **Manifests** | `vercel.json` · `netlify.toml` · `render.yaml` · `Dockerfile` + `nginx.conf` — all downloadable from the in-app **Ship It** panel |

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

The repo ships a zero-config pipeline — [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) —
that builds the bundle and publishes it to GitHub Pages on every push to `main`.

### Setup (once, ~3 minutes)

1. **Create the repo and push**

   ```bash
   git init && git add -A && git commit -m "swarmsys-ai: multi-agent console"
   git branch -M main
   git remote add origin https://github.com/<your-username>/swarmsys-ai.git
   git push -u origin main
   ```

2. **Enable Pages** — repo → **Settings → Pages → Source: GitHub Actions**

3. **Done.** The workflow runs and the console goes live at:

   ```
   https://<your-username>.github.io/swarmsys-ai/
   ```

   Every later push to `main` redeploys automatically — zero-downtime, atomic swap.

### Pipeline anatomy

| Step | Does what |
|------|-----------|
| `actions/checkout@v4` + `setup-node@v4` | Node 20 with the npm cache |
| `npm ci` | reproducible install from the lockfile |
| `npm run build -- --base=./` | static build with **relative asset URLs** (required for the `/<repo>/` sub-path) |
| `actions/upload-pages-artifact@v3` | hands `dist/` to the Pages environment |
| `actions/deploy-pages@v4` | atomic publish behind a `pages` concurrency group |

### Status badge

Drop this under the title once the repo is public:

```markdown
![deploy](https://github.com/<your-username>/swarmsys-ai/actions/workflows/deploy.yml/badge.svg)
```

## Project structure

```
.
├── .github/workflows/deploy.yml # CI: build → GitHub Pages on every push to main
└── src/
    ├── App.tsx                  # panel switching, run lifecycle, operators, scheduler
    ├── components/
    │   ├── TopBar.tsx           # status, clock, notify, operator seats, panel rail
    │   ├── TaskConsole.tsx      # input, presets, model selector, toggles
    │   ├── Pipeline.tsx         # the 8-stage streaming board + approval gate + report
    │   ├── AgentRoster.tsx      # live per-agent status rail
    │   ├── MemoryPanel.tsx      # shared memory / tool calls / run ledger tabs
    │   ├── SchedulerPanel.tsx   # autonomous recurring runs
    │   ├── ReportViewer.tsx     # PDF preview / markdown save modal
    │   ├── ArchitectureSection.tsx # animated DAG (panel 02)
    │   ├── DossiersSection.tsx  # agent prompts & contracts (panel 03)
    │   ├── ShipSection.tsx      # ship actions, deploy targets, checklist (panel 04)
    │   └── NotifyToasts.tsx     # toast stream + browser push
    └── lib/
        ├── engine.ts            # the Orchestrator — gates, fan-outs, patch loop, report
        ├── knowledge.ts         # agent registry, 7 domains, HF models, presets
        ├── web.ts               # live Wikipedia / GitHub / HF hub / OSV.dev clients
        ├── sqlite.ts            # embedded SQL engine
        ├── pdf.ts               # client-side report typesetting
        ├── shipkit.ts           # deploy manifests, targets, ship checklist
        ├── archive.ts           # lazy source-archive builder (?raw + jszip)
        ├── store.ts             # operator-scoped localStorage (ledger, LTM, schedules)
        ├── types.ts             # shared contracts (agents, phases, records, views)
        └── ui.tsx               # Reveal, MarkdownLite, icon set, motion hooks
```

## Port it to production

The console mirrors a LangGraph state graph one-to-one — the `04 Ship it` panel contains the working
skeleton:

```python
g.add_edge("planner", "research")
g.add_edge("planner", "coder")          # fan-out ∥
g.add_edge("research", "qa"); g.add_edge("coder", "qa")
g.add_conditional_edges("reviewer", reviewer.route,
                        {"patch": "coder", "ship": "security"})
g.add_edge("security", "reporter"); g.add_edge("devops", "reporter")
```

Swap each deterministic specialist for an LLM node using its dossier's system prompt; the memory contract,
gates and tools hold.

---

**Design note** — the specialists are deterministic on purpose: the workflow is debuggable without a
single API key, and every live integration degrades gracefully to its offline twin. Multi-agent is an
architecture decision, not a vendor decision.

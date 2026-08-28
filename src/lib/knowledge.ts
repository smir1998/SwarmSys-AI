import type { AgentId } from "./types";

/* ————— agent registry ————— */

export interface AgentDef {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  tools: string[];
  prompt: string;
  responsibilities: string[];
  reads: string[];
  writes: string[];
  sample: string;
}

export const AGENTS: Record<AgentId, AgentDef> = {
  planner: {
    id: "planner",
    name: "Planner",
    role: "Understands the operator's goal, decomposes it into subtasks and assigns each to the right specialist.",
    color: "var(--c-planner)",
    tools: ["knowledge_base", "web_search"],
    prompt:
      "You are the PLANNER agent. Read the user's goal, ground it against domain knowledge and long-term preferences, then decompose it into 4–6 atomic subtasks. Assign every subtask to exactly one specialist and name its tools. Never execute work yourself.",
    responsibilities: ["Parse & understand the goal", "Decompose into atomic subtasks", "Assign owners and tools"],
    reads: ["user.goal", "ltm.preferences"],
    writes: ["plan.subtasks", "plan.owners"],
    sample: "plan.subtasks = 5 tasks · owners: research×2, coder×2, reviewer×1",
  },
  research: {
    id: "research",
    name: "Research",
    role: "Collects evidence — live web hits, prior-art repos, datasets, metrics — and seals it into shared memory.",
    color: "var(--c-research)",
    tools: ["web_search", "github_repos", "knowledge_base", "vector_db"],
    prompt:
      "You are the RESEARCH agent. Collect accurate, current information for the assigned subtasks: query the live web and GitHub for prior art, then retrieve datasets, evaluation metrics and deployment constraints. Summarize findings as compact memory entries.",
    responsibilities: ["Search live web & GitHub", "Retrieve datasets & metrics", "Summarize into memory entries"],
    reads: ["plan.subtasks"],
    writes: ["research.stack", "research.datasets", "research.metrics", "research.live.sources"],
    sample: "research.metrics = precision · recall · F1 · AUC-ROC",
  },
  coder: {
    id: "coder",
    name: "Coder",
    role: "Generates production-ready code with comments and tests, checks it against the locked research decisions.",
    color: "var(--c-coder)",
    tools: ["python_exec", "sql_query", "code_lint", "file_io"],
    prompt:
      "You are the CODER agent. Write production-ready Python with type hints, docstrings and tests. Read the locked research decisions before writing a single line. Never invent dependencies that research did not approve.",
    responsibilities: ["Generate commented code", "Write & run tests", "Debug on reviewer feedback"],
    reads: ["plan.subtasks", "research.stack", "research.datasets", "research.metrics"],
    writes: ["code.artifact", "code.tests"],
    sample: "code.artifact = main.py (214 lines) + 11 passing tests",
  },
  qa: {
    id: "qa",
    name: "QA",
    role: "Runs the full test matrix — unit, edge and property cases — and measures coverage before anything reaches review.",
    color: "var(--c-qa)",
    tools: ["python_exec", "code_lint"],
    prompt:
      "You are the QA agent. Execute the whole test matrix: unit, edge and property cases. Measure coverage, run mutation testing, and document every failure precisely. You break things in here so users never break them out there.",
    responsibilities: ["Run unit + edge matrix", "Measure coverage & mutation score", "Document failure modes"],
    reads: ["code.artifact", "code.tests"],
    writes: ["qa.coverage", "qa.edge_cases"],
    sample: "qa.coverage = 92% · 41 cases · 11/12 mutants killed",
  },
  reviewer: {
    id: "reviewer",
    name: "Reviewer",
    role: "The quality gate: lints, tests and scores the solution. Below 85 it loops the coder once with a patch list.",
    color: "var(--c-reviewer)",
    tools: ["code_lint", "python_exec", "sql_query"],
    prompt:
      "You are the REVIEWER agent. Check quality ruthlessly: run the linter, execute the test suite, verify the research contract was honored, and score 0–100. Below 85, hand the coder a precise patch list — exactly one revision round.",
    responsibilities: ["Run linter & test suite", "Score quality 0–100", "Issue precise patch lists"],
    reads: ["code.artifact", "code.tests", "research.stack"],
    writes: ["review.score", "review.flags"],
    sample: "review.score = 93 · verdict: ship",
  },
  security: {
    id: "security",
    name: "Security",
    role: "Audits the artifact for injection surface, secrets and dependency CVEs via the live OSV.dev feed. Critical findings block the ship.",
    color: "var(--c-security)",
    tools: ["code_lint", "osv_scan", "web_search"],
    prompt:
      "You are the SECURITY agent. Audit for injection surface, hardcoded secrets, unsafe deserialization and known CVEs — query the live OSV.dev advisory feed when enabled. Critical findings block shipping; mitigations go into the report.",
    responsibilities: ["SAST: secrets & injection scan", "Dependency CVE lookup (OSV.dev)", "OWASP risk annotations"],
    reads: ["code.artifact", "research.stack"],
    writes: ["security.findings", "security.verdict"],
    sample: "security.verdict = medium · 2 findings · 0 blockers",
  },
  devops: {
    id: "devops",
    name: "DevOps",
    role: "Packages the solution for production: two-stage Dockerfile, CI workflow, health checks and a rollback plan the reporter can quote.",
    color: "var(--c-devops)",
    tools: ["file_io", "python_exec"],
    prompt:
      "You are the DEVOPS agent. Package for production: write the Dockerfile, the CI workflow and the rollback plan. Nothing ships without a deployment contract — image, pipeline stages, artifact pinning.",
    responsibilities: ["Dockerfile (two-stage build)", "CI workflow + quality gates", "Rollback & artifact pinning"],
    reads: ["code.artifact", "review.score"],
    writes: ["deploy.dockerfile", "deploy.ci", "deploy.rollback"],
    sample: "deploy.contract = docker + 3-stage CI + sha-pinned rollback",
  },
  reporter: {
    id: "reporter",
    name: "Reporter",
    role: "Combines every stage's output into the final report: summary, evidence, code, deployment and risks.",
    color: "var(--c-reporter)",
    tools: ["file_io", "pdf_export"],
    prompt:
      "You are the REPORTER agent. Merge planner, research, coder and reviewer outputs into one final report. Open with a three-line executive summary, include the shipped code, deployment steps and open risks. Be concrete, cite the memory keys.",
    responsibilities: ["Merge all agent outputs", "Write executive summary", "Emit report.md (+ PDF)"],
    reads: ["plan.subtasks", "research.*", "code.artifact", "review.score"],
    writes: ["report.md"],
    sample: "report.md = 7 sections · 1.2k words · 0 unresolved blockers",
  },
};

export const AGENT_ORDER: AgentId[] = [
  "planner",
  "research",
  "coder",
  "qa",
  "reviewer",
  "security",
  "devops",
  "reporter",
];

/* ————— tool registry ————— */

export const TOOL_REGISTRY = [
  { name: "web_search", desc: "live Wikipedia search" },
  { name: "github_repos", desc: "live prior-art repository scan" },
  { name: "hf_registry", desc: "live Hugging Face hub metadata" },
  { name: "osv_scan", desc: "live OSV.dev CVE advisory feed" },
  { name: "knowledge_base", desc: "curated offline facts" },
  { name: "python_exec", desc: "sandboxed interpreter" },
  { name: "sql_query", desc: "embedded ledger database" },
  { name: "code_lint", desc: "static analysis" },
  { name: "vector_db", desc: "similarity retrieval" },
  { name: "file_io", desc: "workspace filesystem" },
  { name: "pdf_export", desc: "client-side PDF writer" },
];

/* ————— Hugging Face model registry —————
   Models are role-tagged: the planner allocates a specialist to every
   agent instead of running one LLM everywhere. quality/speed factors
   shape the simulated run; metadata is verified against the live hub
   API (GET /api/models/:id) when the web is on. */

export type ModelRole = "general" | "code" | "reasoning" | "edge";

export interface ModelDef {
  id: string;
  label: string;
  params: string;
  ctx: string;
  quality: number;
  speed: number;
  role: ModelRole;
  tag: string;
}

export const HF_MODELS: ModelDef[] = [
  { id: "meta-llama/Llama-3.3-70B-Instruct", label: "Llama 3.3 70B", params: "70B", ctx: "128k", quality: 1.12, speed: 0.62, role: "general", tag: "flagship" },
  { id: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B", label: "DeepSeek R1 70B", params: "70B", ctx: "128k", quality: 1.16, speed: 0.55, role: "reasoning", tag: "flagship" },
  { id: "Qwen/Qwen2.5-Coder-32B-Instruct", label: "Qwen2.5 Coder 32B", params: "32B", ctx: "128k", quality: 1.14, speed: 0.72, role: "code", tag: "flagship" },
  { id: "meta-llama/Llama-3.1-8B-Instruct", label: "Llama 3.1 8B", params: "8B", ctx: "128k", quality: 1.0, speed: 1.0, role: "general", tag: "baseline" },
  { id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", label: "DeepSeek R1 7B", params: "7B", ctx: "128k", quality: 1.08, speed: 0.82, role: "reasoning", tag: "reasoning" },
  { id: "Qwen/Qwen2.5-Coder-7B-Instruct", label: "Qwen2.5 Coder 7B", params: "7B", ctx: "128k", quality: 1.06, speed: 1.05, role: "code", tag: "code" },
  { id: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B v0.3", params: "7B", ctx: "32k", quality: 0.97, speed: 1.12, role: "general", tag: "balanced" },
  { id: "microsoft/Phi-3.5-mini-instruct", label: "Phi-3.5 mini", params: "3.8B", ctx: "128k", quality: 0.92, speed: 1.3, role: "edge", tag: "edge" },
];

/* per-agent role preference — the planner allocates accordingly */
export const AGENT_MODEL_PREFS: Record<AgentId, ModelRole> = {
  planner: "reasoning",
  research: "general",
  coder: "code",
  qa: "code",
  reviewer: "reasoning",
  security: "code",
  devops: "general",
  reporter: "general",
};

/* task-specialized non-LLM models — fixed assignments, always on */
export const SPECIALIST_MODELS: { id: string; label: string; role: string; usedBy: AgentId[] }[] = [
  { id: "BAAI/bge-m3", label: "BGE-M3", role: "multilingual embeddings", usedBy: ["research"] },
  { id: "BAAI/bge-reranker-v2-m3", label: "BGE Reranker v2", role: "cross-encoder rerank", usedBy: ["research"] },
  { id: "facebook/bart-large-cnn", label: "BART-Large-CNN", role: "extractive summarization", usedBy: ["reporter"] },
  { id: "distilbert-base-uncased-finetuned-sst-2-english", label: "DistilBERT-SST2", role: "sentiment classification", usedBy: ["qa"] },
];

export interface ModelAssignment {
  agent: AgentId;
  model: ModelDef;
}

/* flagship primary → flagship specialists; baseline primary → mid-tier */
export function modelStackFor(primary: ModelDef): ModelAssignment[] {
  return AGENT_ORDER.map((agent) => {
    const want = AGENT_MODEL_PREFS[agent];
    const candidates = HF_MODELS.filter((m) => m.role === want);
    if (!candidates.length) return { agent, model: primary };
    const pick =
      primary.quality >= 1.1
        ? candidates.reduce((a, b) => (b.quality > a.quality ? b : a))
        : candidates.reduce((a, b) => (Math.abs(b.quality - 1.05) < Math.abs(a.quality - 1.05) ? b : a));
    return { agent, model: pick };
  });
}

export function specialistsFor(agent: AgentId): string[] {
  return SPECIALIST_MODELS.filter((s) => s.usedBy.includes(agent)).map((s) => s.label);
}

/* ————— predefined preset cases —————
   One click bundles the task, the inference model and the swarm policy
   (approval gate + live web) into a ready-to-run configuration. */

export interface Preset {
  id: string;
  label: string;
  note: string;
  task: string;
  modelId: string;
  autoApprove: boolean;
  liveWeb: boolean;
}

export const PRESETS: Preset[] = [
  {
    id: "preset-spam",
    label: "Spam sweep",
    note: "edge model · gate bypassed · live evidence",
    task: "Build a spam email detector",
    modelId: "microsoft/Phi-3.5-mini-instruct",
    autoApprove: true,
    liveWeb: true,
  },
  {
    id: "preset-chatbot",
    label: "Support bot",
    note: "code-tuned · human gate on",
    task: "Build an AI chatbot for customer support",
    modelId: "Qwen/Qwen2.5-Coder-7B-Instruct",
    autoApprove: false,
    liveWeb: true,
  },
  {
    id: "preset-rag",
    label: "RAG audit",
    note: "70B reasoning · flagship stack",
    task: "Create a RAG document assistant",
    modelId: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
    autoApprove: false,
    liveWeb: true,
  },
  {
    id: "preset-sentiment",
    label: "Sentiment board",
    note: "70B flagship · auto-approved",
    task: "Analyze sentiment in product reviews",
    modelId: "meta-llama/Llama-3.3-70B-Instruct",
    autoApprove: true,
    liveWeb: true,
  },
  {
    id: "preset-crawler",
    label: "News crawl",
    note: "offline · deterministic evidence",
    task: "Scrape and clean a news dataset",
    modelId: "mistralai/Mistral-7B-Instruct-v0.3",
    autoApprove: false,
    liveWeb: false,
  },
  {
    id: "preset-forecast",
    label: "Demand forecast",
    note: "baseline model · offline",
    task: "Forecast weekly product demand",
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    autoApprove: false,
    liveWeb: false,
  },
];



/* ————— domain knowledge ————— */

export interface Domain {
  id: string;
  label: string;
  match: RegExp;
  stack: string[];
  datasets: string[];
  metrics: string[];
  wiki: string;
  gh: string;
  sql: string;
  subtasks: { text: string; owner: AgentId; tools: string[] }[];
  research: {
    memory: [string, string][];
    notes: string[];
    code: string[];
  };
  code: {
    file: string;
    lines: string[];
    tests: number;
  };
  review: {
    flags: string[];
    patch: string[];
    pass: string[];
  };
  qa: {
    coverage: number;
    cases: number;
    edges: string[];
  };
  security: {
    findings: string[];
    sev: "clear" | "low" | "medium";
    pkg: string;
  };
  devops: {
    image: string;
    ci: string[];
    rollback: string;
  };
  deployment: string[];
  risks: string[];
}

const PY_HEADER = [
  '"""',
  "SwarmSys AI — generated by the CODER agent.",
  "Contract: honor research.* memory keys; every function typed & tested.",
  '"""',
  "from __future__ import annotations",
  "",
  "import logging",
  "from dataclasses import dataclass",
  "from pathlib import Path",
  "",
  "logger = logging.getLogger(__name__)",
];

export const DOMAINS: Domain[] = [
  {
    id: "spam",
    label: "Email Classification",
    match: /spam|email.*(detect|classif|filter)|phishing/i,
    stack: ["scikit-learn 1.5", "pandas 2.2", "numpy 1.26", "pytest 8.x"],
    datasets: ["Enron-Spam (33k mails, public)", "SpamAssassin public corpus", "Ling-Spam benchmark"],
    metrics: ["precision", "recall", "F1", "false-positive rate"],
    wiki: "Naive Bayes spam filtering",
    gh: "spam classifier python",
    sql: "SELECT COUNT(*) AS prior_runs FROM runs WHERE domain = 'spam'",
    subtasks: [
      { text: "Requirements: binary ham/spam labels, latency < 50 ms/mail", owner: "planner", tools: ["knowledge_base"] },
      { text: "Collect corpora, baselines and evaluation metrics", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Implement TF-IDF + multinomial Naive Bayes pipeline", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Review: cross-check FP rate, holdout leakage, drift plan", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Report: README, deployment steps, risk register", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      memory: [
        ["research.stack", "scikit-learn · pandas · pytest"],
        ["research.datasets", "Enron-Spam (33k) · SpamAssassin"],
        ["research.metrics", "precision · recall · F1 · FP-rate"],
        ["research.baseline", "Multinomial NB beats SVM at 1/40th the latency"],
      ],
      notes: [
        "Multinomial Naive Bayes on TF-IDF remains the strongest latency/accuracy trade-off below 50 ms.",
        "Enron corpus is the de-facto benchmark; SpamAssassin adds modern phishing patterns.",
        "Watch the false-positive rate — a ham mail in spam is 10× worse than the inverse.",
        "Class imbalance ~9:1; report balanced accuracy alongside F1.",
      ],
      code: PY_HEADER.concat([
        "",
        "# research note — locked decision from memory[research.baseline]:",
        "# MultinomialNB on TF-IDF beats SVM at 1/40th the latency.",
        "from sklearn.feature_extraction.text import TfidfVectorizer",
        "from sklearn.metrics import classification_report",
        "from sklearn.model_selection import train_test_split",
        "from sklearn.naive_bayes import MultinomialNB",
        "from sklearn.pipeline import make_pipeline",
      ]),
    },
    code: {
      file: "spam_detector.py",
      lines: PY_HEADER.concat([
        "",
        "from sklearn.feature_extraction.text import TfidfVectorizer",
        "from sklearn.metrics import classification_report",
        "from sklearn.model_selection import train_test_split",
        "from sklearn.naive_bayes import MultinomialNB",
        "from sklearn.pipeline import make_pipeline",
        "",
        "",
        "@dataclass",
        "class Verdict:",
        '    """Result of a single classification."""',
        "",
        "    label: str        # 'ham' | 'spam'",
        "    score: float      # P(spam) in [0, 1]",
        "    features: int     # vocabulary size at training time",
        "",
        "",
        "def build_model(alpha: float = 0.1) -> 'Pipeline':",
        '    """TF-IDF + multinomial Naive Bayes; alpha tuned on dev split."""',
        "    return make_pipeline(",
        "        TfidfVectorizer(min_df=2, sublinear_tf=True, stop_words='english'),",
        "        MultinomialNB(alpha=alpha),",
        "    )",
        "",
        "",
        "def train(texts: list[str], labels: list[int], model) -> dict:",
        '    """Fit on 80%, validate on 20% — never touch the holdout here."""',
        "    X_tr, X_va, y_tr, y_va = train_test_split(texts, labels, test_size=0.2, stratify=labels, random_state=7)",
        "    model.fit(X_tr, y_tr)",
        "    report = classification_report(y_va, model.predict(X_va), output_dict=True)",
        "    return {'accuracy': report['accuracy'], 'macro_f1': report['macro avg']['f1-score']}",
        "",
        "",
        "def classify(model, text: str) -> Verdict:",
        '    """Score one mail; threshold 0.5, tunable per deployment."""',
        "    p = model.predict_proba([text])[0][1]",
        "    return Verdict('spam' if p >= 0.5 else 'ham', round(float(p), 4), len(model[0].vocabulary_))",
        "",
        "",
        "def test_roundtrip(model) -> None:",
        "    v = classify(model, 'congratulations, you won a free cruise — click now')",
        "    assert v.label == 'spam' and v.score > 0.5",
      ]),
      tests: 12,
    },
    review: {
      flags: ["no model versioning — rollback impossible", "threshold hardcoded in classify()"],
      patch: ["add fit() → artifact v1.0.0 + sha256", "hoist threshold into a config constant"],
      pass: ["typed API, docstrings on every public symbol", "12/12 tests green · 0.42s wall", "FP-rate surfaced in the validation report", "stratified split — no holdout leakage"],
    },
    qa: {
      coverage: 94,
      cases: 41,
      edges: ["empty body", "unicode subject line", "10 MB attachment header", "ham misfiled in spam folder"],
    },
    security: {
      findings: ["pickle artifact load → swap to joblib + sha256 verify", "no auth on /classify — add API key middleware"],
      sev: "medium",
      pkg: "scikit-learn",
    },
    devops: {
      image: "python:3.12-slim",
      ci: ["ruff + pytest on push", "artifact signed with sha256", "deploy on tag"],
      rollback: "blue/green — previous artifact pinned by sha",
    },
    deployment: [
      "1 · pip install -r requirements.txt",
      "2 · python -m spam_detector.train --corpus enron",
      "3 · uvicorn api:app --port 8000  →  POST /classify",
      "4 · docker: FROM python:3.12-slim, COPY artifact.pkl",
    ],
    risks: ["concept drift: retrain monthly on flagged mail", "adversarial obfuscation (z3r0 h0urs) lowers recall ~7%", "PII: strip bodies before logging predictions"],
  },
  {
    id: "chatbot",
    label: "Conversational AI",
    match: /chatbot|assistant|customer support|conversational/i,
    stack: ["OpenAI / local LLM", "LangChain 0.3", "FastAPI 0.115", "Redis (session store)"],
    datasets: ["company FAQ export", "Zendesk ticket archive", "persona & escalation matrix"],
    metrics: ["deflection rate", "CSAT", "p95 latency", "escalation rate"],
    wiki: "Conversational agent",
    gh: "rag chatbot fastapi",
    sql: "SELECT COUNT(*) AS prior_runs FROM runs WHERE domain = 'chatbot'",
    subtasks: [
      { text: "Requirements: FAQ grounding, tone guardrails, human escalation", owner: "planner", tools: ["knowledge_base"] },
      { text: "Compare hosted vs local LLMs; pick session store", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Implement retrieval-first reply loop with guardrails", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Review: prompt-injection surface, latency budget", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Report: dialogue flows, deployment, failure modes", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      memory: [
        ["research.stack", "LangChain · FastAPI · Redis"],
        ["research.datasets", "FAQ export · ticket archive"],
        ["research.metrics", "deflection · CSAT · p95 latency"],
        ["research.escalation", "confidence < 0.62 → human handoff"],
      ],
      notes: [
        "Retrieval-first beats pure generation: ground every answer in a FAQ chunk, cite the source.",
        "Confidence below 0.62 should escalate to a human — measured, not guessed.",
        "Keep session state in Redis with a 30-minute TTL; never in the LLM context alone.",
        "Embeddings: BAAI/bge-small-en-v1.5 from the HF hub — 33M params, 384-dim, runs locally.",
      ],
      code: PY_HEADER.concat([
        "",
        "# research note — locked decision from memory[research.escalation]:",
        "# confidence < 0.62 → human handoff, no exceptions.",
        "from langchain_core.prompts import ChatPromptTemplate",
        "from langchain_openai import ChatOpenAI",
        "from fastapi import FastAPI",
        "import redis",
      ]),
    },
    code: {
      file: "support_bot.py",
      lines: PY_HEADER.concat([
        "",
        "from fastapi import FastAPI",
        "from langchain_openai import ChatOpenAI",
        "from pydantic import BaseModel",
        "import redis",
        "",
        "app = FastAPI(title='support-bot')",
        "cache = redis.Redis(decode_responses=True)",
        "llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.2)",
        "",
        "ESCALATE_BELOW = 0.62   # memory[research.escalation]",
        "",
        "",
        "class Turn(BaseModel):",
        "    session: str",
        "    text: str",
        "",
        "",
        "def retrieve_kb(query: str, k: int = 3) -> list[str]:",
        '    """Vector search over FAQ chunks; returns cited snippets."""',
        "    return vector_store.similarity_search(query, k=k)",
        "",
        "",
        "@app.post('/chat')",
        "async def chat(turn: Turn) -> dict:",
        '    """Retrieval-first reply with confidence gate to humans."""',
        "    hits = retrieve_kb(turn.text)",
        "    answer = await llm.ainvoke(prompt.format(ctx='\\n'.join(hits), q=turn.text))",
        "    confidence = score_grounding(answer, hits)",
        "    if confidence < ESCALATE_BELOW:",
        "        return {'reply': 'Routing you to a specialist…', 'escalated': True}",
        "    return {'reply': answer.content, 'citations': hits, 'escalated': False}",
        "",
        "",
        "def test_escalation_gate() -> None:",
        "    assert ESCALATE_BELOW == 0.62  # contract from research agent",
      ]),
      tests: 9,
    },
    review: {
      flags: ["session TTL not enforced", "no rate limit on /chat"],
      patch: ["expire sessions after 30 min (cache.expire)", "slowapi: 30 req/min per session"],
      pass: ["grounding citations on every reply", "escalation threshold matches research contract", "async handlers — p95 headroom intact", "9/9 tests green · 0.38s wall"],
    },
    qa: {
      coverage: 92,
      cases: 33,
      edges: ["empty turn", "2k-token input", "prompt-injection probe", "emoji-only message"],
    },
    security: {
      findings: ["prompt injection via customer text — allow-list intents", "PII redaction before logging"],
      sev: "medium",
      pkg: "fastapi",
    },
    devops: {
      image: "python:3.12-slim",
      ci: ["unit + contract tests", "canary 10% → full rollout"],
      rollback: "canary auto-reverts on CSAT drop",
    },
    deployment: [
      "1 · export OPENAI_API_KEY=sk-…",
      "2 · uvicorn support_bot:app --workers 2",
      "3 · fly.io deploy, min 256 MB",
      "4 · wire /chat behind the existing help-center widget",
    ],
    risks: ["prompt injection via customer text — sanitize + allow-list intents", "LLM cost drift: cap context at 2k tokens", "fallback: if LLM p95 > 800 ms, serve canned FAQ answers"],
  },
  {
    id: "rag",
    label: "RAG Pipeline",
    match: /\brag\b|retrieval.augmented|document (qa|assistant)|knowledge base (qa|search)/i,
    stack: ["LangChain 0.3", "ChromaDB", "sentence-transformers", "FastAPI"],
    datasets: ["internal PDF/MD corpus", "chunking eval set (120 Q/A pairs)"],
    metrics: ["recall@5", "faithfulness", "answer relevance", "context precision"],
    wiki: "Retrieval-augmented generation",
    gh: "langchain rag",
    sql: "SELECT COUNT(*) AS prior_runs FROM runs WHERE domain = 'rag'",
    subtasks: [
      { text: "Requirements: corpus ingestion, citation-first answers", owner: "planner", tools: ["knowledge_base"] },
      { text: "Benchmark chunk size and embedding models", owner: "research", tools: ["web_search", "vector_db"] },
      { text: "Implement ingest → embed → retrieve → generate loop", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Review: hallucination surface, recall@5 on eval set", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Report: eval numbers, deployment, reindex cadence", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      memory: [
        ["research.stack", "LangChain · ChromaDB · all-MiniLM-L6-v2"],
        ["research.datasets", "internal corpus · 120-pair eval set"],
        ["research.metrics", "recall@5 · faithfulness · relevance"],
        ["research.chunking", "800 chars / 100 overlap wins on recall@5"],
      ],
      notes: [
        "800-char chunks with 100-char overlap beat 512/2048 variants on recall@5 for this corpus shape.",
        "all-MiniLM-L6-v2 embeds locally at ~900 chunks/s — no API dependency.",
        "Hybrid retrieval (BM25 + dense) lifts recall@5 by 6 points on keyword-heavy queries.",
        "Multilingual upgrade path: BAAI/bge-m3 on the HF hub — same pipeline, 100+ languages.",
      ],
      code: PY_HEADER.concat([
        "",
        "# research note — locked decision from memory[research.chunking]:",
        "# 800 chars / 100 overlap; hybrid BM25 + dense retrieval.",
        "from langchain_text_splitters import RecursiveCharacterTextSplitter",
        "from langchain_chroma import Chroma",
        "from sentence_transformers import SentenceTransformer",
      ]),
    },
    code: {
      file: "rag_assistant.py",
      lines: PY_HEADER.concat([
        "",
        "from langchain_chroma import Chroma",
        "from langchain_text_splitters import RecursiveCharacterTextSplitter",
        "from sentence_transformers import SentenceTransformer",
        "",
        "embedder = SentenceTransformer('all-MiniLM-L6-v2')",
        "splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)",
        "",
        "",
        "def ingest(paths: list[str], collection: str = 'docs') -> int:",
        '    """Chunk → embed → store; returns chunk count."""',
        "    chunks = [c for p in paths for c in splitter.split_text(Path(p).read_text())]",
        "    Chroma.from_texts(chunks, embedding=embedder, collection_name=collection)",
        "    logger.info('indexed %d chunks', len(chunks))",
        "    return len(chunks)",
        "",
        "",
        "def ask(question: str, k: int = 5) -> dict:",
        '    """Retrieve k chunks, generate a grounded answer, cite chunk ids."""',
        "    hits = Chroma(collection_name='docs', embedding_function=embedder)",
        "    docs = hits.similarity_search_with_score(question, k=k)",
        "    answer = generate(question, docs)   # LLM call with citation prompt",
        "    return {'answer': answer, 'sources': [d.metadata['id'] for d, _ in docs]}",
        "",
        "",
        "def test_citations_present() -> None:",
        "    res = ask('What is the refund window?')",
        "    assert res['sources'], 'every answer must cite at least one chunk'",
      ]),
      tests: 10,
    },
    review: {
      flags: ["no dedupe on re-ingest", "retrieval not hybrid yet (BM25 leg missing)"],
      patch: ["hash-based chunk dedupe before insert", "add BM25 leg + reciprocal rank fusion"],
      pass: ["citation contract enforced by test", "chunking matches research.chunking exactly", "embeddings local — no API key on the hot path", "10/10 tests green · 0.51s wall"],
    },
    qa: {
      coverage: 91,
      cases: 38,
      edges: ["PDF with tables", "non-utf8 source", "zero-hit query", "12k-char document"],
    },
    security: {
      findings: ["chunk ids must be validated before citation", "collection-level ACL on the vector store"],
      sev: "low",
      pkg: "chromadb",
    },
    devops: {
      image: "python:3.12-slim",
      ci: ["retrieval eval on every index build", "nightly reindex job"],
      rollback: "keep the last two index snapshots",
    },
    deployment: [
      "1 · python rag_assistant.py ingest ./docs",
      "2 · uvicorn api:app  →  POST /ask",
      "3 · Chroma persists to ./chroma — mount a volume",
      "4 · nightly reindex cron keeps recall@5 honest",
    ],
    risks: ["stale index after doc edits — reindex on push", "citation hallucination: verify chunk IDs exist before returning", "multilingual corpus needs a stronger embedder (bge-m3)"],
  },
  {
    id: "sentiment",
    label: "Sentiment Analytics",
    match: /sentiment|reviews? (analysis|mining)|opinion/i,
    stack: ["transformers 4.44", "streamlit 1.38", "pandas", "plotly"],
    datasets: ["Amazon polarity subset", "client CSV export (utf-8)", "Yelp open dataset slice"],
    metrics: ["macro-F1", "drift score (PSI)", "dashboard p95 render"],
    wiki: "Sentiment analysis",
    gh: "streamlit sentiment dashboard",
    sql: "SELECT COUNT(*) AS prior_runs FROM runs WHERE domain = 'sentiment'",
    subtasks: [
      { text: "Requirements: 3-class labels, live dashboard, CSV ingest", owner: "planner", tools: ["knowledge_base"] },
      { text: "Pick model: fine-tuned distilBERT vs lexicon baseline", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Implement batch scorer + streamlit dashboard", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Review: encoding traps, label leakage, chart honesty", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Report: methodology, deployment, monitoring plan", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      memory: [
        ["research.stack", "transformers · streamlit · plotly"],
        ["research.datasets", "Amazon polarity · client CSV"],
        ["research.metrics", "macro-F1 · PSI drift · render p95"],
        ["research.model", "distilBERT fine-tune: F1 0.91 vs lexicon 0.74"],
      ],
      notes: [
        "distilbert-base-uncased-finetuned-sst-2-english (HF hub) reaches macro-F1 0.91 — lexicon baselines top out at 0.74.",
        "Negation handling ('not bad') is where lexicon methods bleed the most.",
        "Track PSI monthly; review language drifts and a 0.2 PSI means retrain.",
        "Dashboards lie by default: always show the confidence distribution, not just the mean.",
      ],
      code: PY_HEADER.concat([
        "",
        "# research note — locked decision from memory[research.model]:",
        "# distilBERT fine-tune (F1 0.91) beats lexicon baseline (0.74).",
        "from transformers import pipeline",
        "import pandas as pd",
        "import streamlit as st",
      ]),
    },
    code: {
      file: "sentiment_board.py",
      lines: PY_HEADER.concat([
        "",
        "import pandas as pd",
        "import streamlit as st",
        "from transformers import pipeline",
        "",
        "LABELS = {'positive': 1, 'neutral': 0, 'negative': -1}",
        "",
        "",
        "@st.cache_resource",
        "def scorer():",
        '    """Load once per worker — model init is the expensive part."""',
        "    return pipeline('sentiment-analysis', model='distilbert-sst2', top_k=None)",
        "",
        "",
        "def score_batch(texts: list[str]) -> pd.DataFrame:",
        '    """Batch inference; returns label, score and signed intensity."""',
        "    raw = scorer()(texts, batch_size=32, truncation=True, max_length=512)",
        "    rows = [max(r, key=lambda x: x['score']) for r in raw]",
        "    df = pd.DataFrame(rows)",
        "    df['signed'] = df['score'] * df['label'].map(LABELS)",
        "    return df",
        "",
        "",
        "def main() -> None:",
        '    """Streamlit dashboard — uploads, trends, confidence spread."""',
        "    st.title('Review sentiment board')",
        "    csv = st.file_uploader('Export (utf-8)', type='csv')",
        "    if csv:",
        "        df = score_batch(pd.read_csv(csv)['text'].tolist())",
        "        st.plotly_chart(trend_chart(df), use_container_width=True)",
        "",
        "",
        "def test_label_map() -> None:",
        "    assert set(LABELS) == {'positive', 'neutral', 'negative'}",
      ]),
      tests: 8,
    },
    review: {
      flags: ["CSV read assumes utf-8 — client exports are cp1252", "confidence histogram missing from dashboard"],
      patch: ["encoding fallback: utf-8 → cp1252 → latin-1", "add st.plotly_chart(confidence_hist(df))"],
      pass: ["model cached per worker — cold start once", "signed intensity enables honest trend lines", "batch_size + truncation bound memory", "8/8 tests green · 0.35s wall"],
    },
    qa: {
      coverage: 90,
      cases: 29,
      edges: ["empty review", "mixed-language text", "5k-char review", "all-neutral batch"],
    },
    security: {
      findings: ["CSV injection on export (=cmd cells)", "file-upload size cap missing"],
      sev: "medium",
      pkg: "transformers",
    },
    devops: {
      image: "python:3.12-slim (CUDA-free)",
      ci: ["model eval gate: macro-F1 ≥ 0.88", "streamlit cloud deploy"],
      rollback: "pin the model revision sha",
    },
    deployment: [
      "1 · streamlit run sentiment_board.py",
      "2 · docker: pip deps ≈ 1.4 GB — use the slim CUDA-free image",
      "3 · host on streamlit.cloud (free tier suffices)",
      "4 · schedule PSI check monthly",
    ],
    risks: ["sarcasm & negation still ~8% error — surface low-confidence rows for humans", "model drift: retrain when PSI > 0.2", "GPU not needed; CPU inference ≈ 40 reviews/s"],
  },
  {
    id: "crawler",
    label: "Data Acquisition",
    match: /scrap|crawl|news dataset|web data/i,
    stack: ["requests 2.32", "BeautifulSoup 4.12", "pandas", "sqlite3"],
    datasets: ["target sitemap", "robots.txt", "article schema (title, body, ts)"],
    metrics: ["parse success rate", "dedupe ratio", "politeness (req/s)"],
    wiki: "Web scraping",
    gh: "requests beautifulsoup scraper",
    sql: "SELECT COUNT(*) AS prior_runs FROM runs WHERE domain = 'crawler'",
    subtasks: [
      { text: "Requirements: schema, dedupe, robots.txt compliance", owner: "planner", tools: ["knowledge_base"] },
      { text: "Check rate limits, sitemap, legal constraints", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Implement polite crawler with sqlite sink", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Review: politeness, retry policy, schema validation", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Report: runbook, cron schedule, data contract", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      memory: [
        ["research.stack", "requests · BeautifulSoup · sqlite3"],
        ["research.datasets", "sitemap · robots.txt · article schema"],
        ["research.metrics", "parse success · dedupe ratio · req/s"],
        ["research.politeness", "1 req/s, respect Crawl-delay, UA identify"],
      ],
      notes: [
        "Target allows 1 req/s per robots.txt with a Crawl-delay directive — honor it or get IP-banned.",
        "The sitemap covers 98% of articles; crawling blind wastes 40× the requests.",
        "SHA-1 of normalized body text dedupes syndicated copies (measured 11% duplicates).",
        "Identify the crawler in the User-Agent; hidden scraping violates the site's ToS.",
      ],
      code: PY_HEADER.concat([
        "",
        "# research note — locked decision from memory[research.politeness]:",
        "# 1 req/s, sitemap-first, identify in the User-Agent.",
        "import time, hashlib, sqlite3",
        "import requests",
        "from bs4 import BeautifulSoup",
      ]),
    },
    code: {
      file: "news_crawler.py",
      lines: PY_HEADER.concat([
        "",
        "import hashlib",
        "import sqlite3",
        "import time",
        "",
        "import requests",
        "from bs4 import BeautifulSoup",
        "",
        "DELAY = 1.0   # memory[research.politeness]: 1 req/s",
        "UA = {'User-Agent': 'swarmsys-ai-demo/0.9 (+edu)'}",
        "",
        "",
        "def fetch_sitemap(url: str) -> list[str]:",
        '    """Sitemap-first: 98% coverage at 1/40th the request cost."""',
        "    soup = BeautifulSoup(requests.get(url, headers=UA, timeout=10).text, 'xml')",
        "    return [loc.text for loc in soup.find_all('loc')]",
        "",
        "",
        "def parse_article(html: str) -> dict:",
        '    """Extract title/body/timestamp; raise on schema violation."""',
        "    soup = BeautifulSoup(html, 'html.parser')",
        "    return {'title': soup.h1.text.strip(), 'body': soup.article.get_text(' ', strip=True), 'ts': soup.time['datetime']}",
        "",
        "",
        "def crawl(urls: list[str], db: str = 'news.db') -> int:",
        '    """Polite crawl with SHA-1 dedupe into sqlite."""',
        "    con = sqlite3.connect(db)",
        "    saved = 0",
        "    for u in urls:",
        "        time.sleep(DELAY)",
        "        art = parse_article(requests.get(u, headers=UA, timeout=10).text)",
        "        fp = hashlib.sha1(art['body'].encode()).hexdigest()",
        "        try:",
        "            con.execute('INSERT INTO articles VALUES (?,?,?,?)', (fp, art['title'], art['body'], art['ts']))",
        "            saved += 1",
        "        except sqlite3.IntegrityError:",
        "            pass   # duplicate — syndicated copy",
        "    return saved",
      ]),
      tests: 7,
    },
    review: {
      flags: ["no retry/backoff on 429", "timeout missing on sitemap fetch … fixed in patch"],
      patch: ["wrap fetch in tenacity: 3 retries, exp backoff", "log skipped duplicates with their URL"],
      pass: ["robots.txt delay hardcoded & tested", "SHA-1 dedupe verified at 11% on sample", "schema violations raise, never store junk", "7/7 tests green · 0.29s wall"],
    },
    qa: {
      coverage: 96,
      cases: 24,
      edges: ["404 page", "connection timeout", "non-utf8 body", "empty sitemap"],
    },
    security: {
      findings: ["SSRF guard: allow-list hostnames", "rate-limit state file permissions"],
      sev: "low",
      pkg: "requests",
    },
    devops: {
      image: "python:3.12-slim",
      ci: ["schema contract tests", "nightly cron + alert on <95% parse"],
      rollback: "sqlite snapshot before each run",
    },
    deployment: [
      "1 · python news_crawler.py --sitemap https://…/sitemap.xml",
      "2 · cron: nightly at 03:00 (off-peak, polite)",
      "3 · sqlite file → S3 snapshot after each run",
      "4 · alert when parse success < 95%",
    ],
    risks: ["layout change breaks selectors — pin to schema tests", "rate limit breach = IP ban; the DELAY is not negotiable", "legal: stay inside robots.txt, no paywalled content"],
  },
  {
    id: "forecast",
    label: "Demand Forecasting",
    match: /forecast|demand|time series|predict(ion)?s?/i,
    stack: ["prophet 1.1", "pandas", "scikit-learn (backtest)", "FastAPI"],
    datasets: ["24 months of SKU-week sales", "promo & holiday calendar", "stockout flags"],
    metrics: ["MAPE", "sMAPE", "backtest coverage"],
    wiki: "Time series forecasting",
    gh: "prophet demand forecasting",
    sql: "SELECT COUNT(*) AS prior_runs FROM runs WHERE domain = 'forecast'",
    subtasks: [
      { text: "Requirements: SKU-week granularity, promo lift, holidays", owner: "planner", tools: ["knowledge_base"] },
      { text: "Compare Prophet vs seasonal-naive vs LightGBM", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Implement pipeline with rolling backtest", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Review: leakage in backtest, promo encoding", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Report: backtest table, deployment, retrain cadence", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      memory: [
        ["research.stack", "prophet · pandas · FastAPI"],
        ["research.datasets", "24mo SKU-week sales · promo calendar"],
        ["research.metrics", "MAPE · sMAPE · backtest coverage"],
        ["research.model", "Prophet + promos: MAPE 11.2% vs naive 19.8%"],
      ],
      notes: [
        "Prophet with promo regressors hits MAPE 11.2%; seasonal naive sits at 19.8% — LightGBM adds 0.4% for 10× the ops cost.",
        "Promo lifts are multiplicative, not additive — encode in log space.",
        "Backtest on 5 rolling origins; a single split overfits the holiday season.",
        "Stockout weeks must be censored, not dropped — they hide real demand.",
      ],
      code: PY_HEADER.concat([
        "",
        "# research note — locked decision from memory[research.model]:",
        "# Prophet + promo regressors (MAPE 11.2%) beats seasonal naive (19.8%).",
        "from prophet import Prophet",
        "import pandas as pd",
      ]),
    },
    code: {
      file: "demand_forecast.py",
      lines: PY_HEADER.concat([
        "",
        "import pandas as pd",
        "from prophet import Prophet",
        "",
        "",
        "def load_history(path: str) -> pd.DataFrame:",
        '    """Censor stockout weeks instead of dropping them."""',
        "    df = pd.read_csv(path, parse_dates=['week'])",
        "    df.loc[df['stockout'], 'y'] = None",
        "    return df.rename(columns={'week': 'ds', 'units': 'y'})",
        "",
        "",
        "def fit(df: pd.DataFrame, promos: pd.DataFrame) -> Prophet:",
        '    """Prophet with multiplicative promos + yearly seasonality."""',
        "    m = Prophet(seasonality_mode='multiplicative', yearly_seasonality=True)",
        "    m.add_regressor('promo', mode='multiplicative')",
        "    m.fit(df.merge(promos, on='ds', how='left').fillna({'promo': 0}))",
        "    return m",
        "",
        "",
        "def backtest(df: pd.DataFrame, origins: int = 5) -> float:",
        '    """Rolling-origin MAPE — never train on the fold you score."""',
        "    errors = []",
        "    for o in range(origins):",
        "        cut = len(df) - 8 * (o + 1)",
        "        m = fit(df.iloc[:cut], promos)",
        "        fc = m.predict(make_future(m, 8))",
        "        errors.append(mape(df.iloc[cut : cut + 8]['y'], fc['yhat']))",
        "    return float(sum(errors) / len(errors))",
        "",
        "",
        "def test_no_future_leak() -> None:",
        "    assert backtest.__doc__ is not None  # and cut < len(df), always",
      ]),
      tests: 9,
    },
    review: {
      flags: ["promos df referenced before definition in backtest()", "MAPE undefined when actuals contain 0"],
      patch: ["pass promos into backtest() explicitly", "sMAPE fallback for zero-demand SKUs"],
      pass: ["stockout censoring implemented as researched", "rolling-origin backtest — no leakage", "multiplicative promo encoding matches research", "9/9 tests green · 0.44s wall"],
    },
    qa: {
      coverage: 93,
      cases: 31,
      edges: ["zero-demand SKU", "promo on a holiday", "5-week short history", "DST transition week"],
    },
    security: {
      findings: ["input validation on the sku parameter", "signed artifact store"],
      sev: "clear",
      pkg: "prophet",
    },
    devops: {
      image: "python:3.12-slim",
      ci: ["backtest gate: MAPE ≤ 15%", "weekly retrain job"],
      rollback: "keep four weekly model versions",
    },
    deployment: [
      "1 · python demand_forecast.py --history sales.csv",
      "2 · serve via FastAPI: GET /forecast?sku=…&weeks=8",
      "3 · retrain weekly; alert when backtest MAPE > 15%",
      "4 · archive model artifacts per retrain",
    ],
    risks: ["promo calendar drift — marketing changes plans without telling the model", "new SKUs have no history: fall back to category-level priors", "holiday shifts (Easter) move demand ±2 weeks"],
  },
];

export function detectDomain(task: string): Domain {
  return DOMAINS.find((d) => d.match.test(task)) ?? genericDomain(task);
}

function genericDomain(task: string): Domain {
  const kw =
    task
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !["build", "create", "write", "make", "with", "from", "that", "this", "using"].includes(w))
      .slice(0, 3)
      .join(" ") || "automation";
  return {
    id: "manual",
    label: "General Automation",
    match: /.^/,
    stack: ["Python 3.12", "FastAPI", "SQLAlchemy", "pytest"],
    datasets: ["operator-provided CSV/JSON", "public API exports"],
    metrics: ["task success rate", "p95 runtime", "error rate"],
    wiki: kw,
    gh: `${kw} python`,
    sql: "SELECT id, task, score FROM runs ORDER BY at DESC LIMIT 3",
    subtasks: [
      { text: "Clarify goal; derive acceptance criteria", owner: "planner", tools: ["knowledge_base"] },
      { text: "Survey approaches and prior art on the live web", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Implement a minimal, typed, tested solution", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Review for correctness and failure modes", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Report: summary, code, deployment notes", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      memory: [
        ["research.stack", "Python 3.12 · FastAPI · pytest"],
        ["research.datasets", "operator-provided exports"],
        ["research.metrics", "success rate · p95 runtime"],
        ["research.approach", "smallest correct thing first; generalize later"],
      ],
      notes: [
        "No curated domain matched — the research agent fell back to first principles and live web evidence.",
        "Prefer boring technology: stdlib first, one dependency per missing capability.",
        "Reasoning leg: microsoft/Phi-3.5-mini-instruct on the HF hub covers it at 3.8B params.",
      ],
      code: PY_HEADER.concat([
        "",
        "# research note — generic fallback: stdlib first, typed, tested.",
        "import json",
        "from typing import Any",
      ]),
    },
    code: {
      file: "solution.py",
      lines: PY_HEADER.concat([
        "",
        "import json",
        "from dataclasses import dataclass, asdict",
        "from typing import Any",
        "",
        "",
        "@dataclass",
        "class TaskResult:",
        '    """Typed envelope for every pipeline output."""',
        "",
        "    ok: bool",
        "    payload: dict[str, Any]",
        "    errors: list[str]",
        "",
        "",
        "def run(input_path: str) -> TaskResult:",
        '    """Read → transform → validate. Stdlib only on purpose."""',
        "    data = json.loads(open(input_path).read())",
        "    if not isinstance(data, list):",
        "        return TaskResult(False, {}, ['expected a JSON array'])",
        "    cleaned = [row for row in data if isinstance(row, dict) and row]",
        "    return TaskResult(True, {'rows': len(cleaned)}, [])",
        "",
        "",
        "def test_envelope() -> None:",
        "    r = run('sample.json')",
        "    assert isinstance(asdict(r)['ok'], bool)",
      ]),
      tests: 6,
    },
    review: {
      flags: ["error messages lack input context", "no CLI entry point"],
      patch: ["include filename + row index in errors", "add argparse main guarded by __name__"],
      pass: ["typed envelope — no raw dicts escape", "stdlib-only footprint", "6/6 tests green · 0.21s wall"],
    },
    qa: {
      coverage: 88,
      cases: 18,
      edges: ["empty file", "malformed JSON", "huge input", "nested rows"],
    },
    security: {
      findings: ["validate the input schema strictly", "no shell escapes in paths"],
      sev: "low",
      pkg: "fastapi",
    },
    devops: {
      image: "python:3.12-slim",
      ci: ["pytest on push", "structured JSON logs to stdout"],
      rollback: "version tag per release",
    },
    deployment: ["1 · python solution.py input.json", "2 · wrap in FastAPI when an interface is needed", "3 · log structured JSON to stdout"],
    risks: ["underspecified goal — acceptance criteria are assumptions, confirm them", "scope creep: ship the minimal version first"],
  };
}

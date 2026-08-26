import type { AgentId, LineKind } from "./types";

/* ————— agent registry ————— */
export const AGENT_ORDER: AgentId[] = ["planner", "research", "coder", "reviewer", "reporter"];

export interface AgentDef {
  id: AgentId;
  name: string;
  color: string;
  role: string;
  prompt: string;
  responsibilities: string[];
  tools: string[];
  reads: string[];
  writes: string[];
  sample: string;
}

export const AGENTS: Record<AgentId, AgentDef> = {
  planner: {
    id: "planner",
    name: "Planner",
    color: "var(--c-planner)",
    role: "Decomposes the operator's goal into an ordered subtask graph and assigns owners.",
    prompt:
      "You are the PLANNER. Given a user goal, decompose it into the smallest set of subtasks that fully covers it. For each subtask state: owner agent, required tools, and done-criteria. Never execute work yourself — plan only. Prefer boring, shippable scopes over clever ones. Read long-term memory first and reuse prior stack choices when they fit.",
    responsibilities: [
      "Understand the goal & detect its domain",
      "Break it into the smallest covering subtasks",
      "Assign an owner agent + tools per subtask",
      "Estimate plan confidence; honor re-scope requests",
    ],
    tools: ["knowledge_base", "calculator"],
    reads: ["ltm.*"],
    writes: ["plan.subtasks", "plan.confidence"],
    sample: "6 subtasks · research×2 / coder×2 / reviewer×1 / reporter×1 · conf 0.91",
  },
  research: {
    id: "research",
    name: "Research",
    color: "var(--c-research)",
    role: "Hunts accurate, current evidence and stores decision-grade facts in shared memory.",
    prompt:
      "You are RESEARCH. Gather accurate, current information for your assigned subtasks. Cite a source per claim, prefer benchmarks and public datasets, and store every decision-grade fact in shared memory as key=value. Flag anything contradictory, expensive, or likely to drift.",
    responsibilities: [
      "Survey candidate approaches & benchmarks",
      "Pick datasets, metrics and evaluation protocol",
      "Lock the stack so CODER builds on facts",
      "Flag contradictions & drift risks",
    ],
    tools: ["web_search", "knowledge_base", "sql_query"],
    reads: ["plan.subtasks"],
    writes: ["research.model", "research.dataset", "research.metrics"],
    sample: "model=MultinomialNB+TF-IDF · dataset=Enron-Spam v2 (51,730) · metric=PR-AUC",
  },
  coder: {
    id: "coder",
    name: "Coder",
    color: "var(--c-coder)",
    role: "Reads research memory, then ships production-ready Python with tests that actually run.",
    prompt:
      "You are CODER. Before writing code, read the shared memory written by RESEARCH. Produce production-ready Python: type hints, docstrings, explicit error handling, and tests you execute. Keep dependencies minimal; log, don't print. Apply reviewer patches without argument.",
    responsibilities: [
      "Generate typed, documented code",
      "Wire research decisions into the implementation",
      "Run the test suite, fix failures",
      "Apply reviewer patches in one round",
    ],
    tools: ["python_exec", "file_io", "code_lint"],
    reads: ["research.*"],
    writes: ["code.file", "code.tests"],
    sample: "src/spam_detector.py · 58 lines · pytest: 7 passed in 0.42s",
  },
  reviewer: {
    id: "reviewer",
    name: "Reviewer",
    color: "var(--c-reviewer)",
    role: "Audits the build for correctness, robustness and clarity — sends back what isn't ship-ready.",
    prompt:
      "You are REVIEWER. Audit the code against correctness, robustness, and clarity. Run the tests and the linter. Return a 0–100 quality score with evidence and a list of concrete flags. Any flag rated 'blocker' sends the code back to CODER for exactly one patch round, then you re-score.",
    responsibilities: [
      "Lint + execute the test suite",
      "Score quality 0–100 with evidence per flag",
      "Open concrete, fixable flags",
      "Blockers trigger a patch round, then re-review",
    ],
    tools: ["code_lint", "python_exec"],
    reads: ["code.*"],
    writes: ["review.score", "review.flags"],
    sample: "score 91/100 · 0 open flags · patch rounds: 1",
  },
  reporter: {
    id: "reporter",
    name: "Reporter",
    color: "var(--c-reporter)",
    role: "Merges every artifact into one report a busy human can skim in sixty seconds.",
    prompt:
      "You are REPORTER. Merge plan, research, code, and review into one report a busy human can skim in 60 seconds: summary first, evidence second, deployment last. No filler, no hedging — every number must trace to this run's shared memory.",
    responsibilities: [
      "Lead with a 3-line executive summary",
      "Assemble code, metrics & deployment steps",
      "List risks and next steps honestly",
      "Emit report.md (+ executive brief on request)",
    ],
    tools: ["file_io"],
    reads: ["*"],
    writes: ["report.md"],
    sample: "report.md · 7 sections · 2.1 KB · deploy: one Dockerfile",
  },
};

/* ————— tool registry ————— */
export const TOOL_REGISTRY = [
  { name: "web_search", desc: "live documentation & benchmark lookup" },
  { name: "knowledge_base", desc: "curated ML/systems pattern library" },
  { name: "python_exec", desc: "sandboxed interpreter + pytest runner" },
  { name: "code_lint", desc: "static analysis & type checking" },
  { name: "sql_query", desc: "structured dataset inspection" },
  { name: "vector_db", desc: "embedding store read/write (Chroma)" },
  { name: "file_io", desc: "project tree & artifact writer" },
];

/* ————— domain knowledge ————— */
export interface ToolSpec {
  tool: string;
  arg: string;
  result: string;
}
export interface Line {
  kind: LineKind;
  text: string;
}
export interface MemSpec {
  key: string;
  value: string;
}

export interface DomainDef {
  id: string;
  label: string;
  title: string;
  keywords: string[];
  scope: string;
  subtasks: { text: string; owner: AgentId; tools: string[] }[];
  research: { tools: ToolSpec[]; lines: Line[]; memory: MemSpec[] };
  coding: { pre: Line[]; file: string; code: string; testResult: string; post: Line[]; memory: MemSpec[] };
  review: { first: Line[]; patch: string[]; second: Line[]; baseScore: number };
  report: { findings: string[]; deploy: string[]; risks: string[] };
}

const SPAM_CODE = `"""Spam detector — TF-IDF + MultinomialNB baseline.
Trained on the Enron-Spam corpus (51,730 mails).
"""
from __future__ import annotations
import logging
from dataclasses import dataclass
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

logger = logging.getLogger("spam")

@dataclass
class Verdict:
    label: str          # "spam" | "ham"
    confidence: float   # P(label)

class SpamDetector:
    """Thin wrapper so the pipeline is swappable without API changes."""

    def __init__(self) -> None:
        self.model = Pipeline([
            ("tfidf", TfidfVectorizer(max_features=20_000, ngram_range=(1, 2))),
            ("clf", MultinomialNB(alpha=0.1)),
        ])

    def fit(self, texts: list[str], labels: list[int]) -> dict:
        if len(texts) != len(labels):
            raise ValueError("texts/labels length mismatch")
        x_tr, x_te, y_tr, y_te = train_test_split(
            texts, labels, test_size=0.2, stratify=labels, random_state=42
        )
        self.model.fit(x_tr, y_tr)
        report = classification_report(
            y_te, self.model.predict(x_te), output_dict=True
        )
        logger.info("held-out macro F1=%.3f", report["macro avg"]["f1-score"])
        return report

    def predict(self, email: str) -> Verdict:
        proba = self.model.predict_proba([email])[0]
        idx = int(proba.argmax())
        return Verdict("spam" if idx == 1 else "ham", float(proba[idx]))`;

const CHAT_CODE = `"""Support chatbot — LangGraph agent, summary memory + docs retrieval.
Stack locked by RESEARCH: gpt-4o-mini, local llama3.1:8b fallback.
"""
from __future__ import annotations
import logging
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

logger = logging.getLogger("kite")

SYSTEM = (
    "You are 'Kite', a support agent for Acme Cloud. Be concise, "
    "cite the doc chunk you used, and hand off to a human whenever "
    "billing or data deletion is involved."
)

def build_agent(tools: list):
    """React agent with per-thread checkpointer (conversation memory)."""
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
    return create_react_agent(llm, tools, checkpointer=MemorySaver())

def ask(agent, thread_id: str, question: str) -> str:
    if not question.strip():
        raise ValueError("question must not be empty")
    config = {"configurable": {"thread_id": thread_id}}
    state = {"messages": [SystemMessage(SYSTEM), HumanMessage(question)]}
    out = agent.invoke(state, config=config)
    logger.info("thread=%s turns ok", thread_id)
    return out["messages"][-1].content`;

const RAG_CODE = `"""PDF Q&A — chunk -> embed -> retrieve -> answer.
Embedder: bge-small-en-v1.5 · store: Chroma (512/64 chunks).
"""
from __future__ import annotations
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from sentence_transformers import SentenceTransformer

CHUNK, OVERLAP = 512, 64

class DocIndex:
    """Ingests PDFs once; answers via similarity search + rerank."""

    def __init__(self, embedder: str = "BAAI/bge-small-en-v1.5") -> None:
        self.encoder = SentenceTransformer(embedder)
        self.store: Chroma | None = None

    def ingest(self, pdf: str | Path) -> int:
        if not Path(pdf).exists():
            raise FileNotFoundError(pdf)
        pages = PyPDFLoader(str(pdf)).load()
        chunks = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK, chunk_overlap=OVERLAP
        ).split_documents(pages)
        self.store = Chroma.from_documents(
            chunks, embedding_function=self.encoder.encode,
            persist_directory="./vec",
        )
        return len(chunks)

    def query(self, question: str, k: int = 4) -> list[str]:
        if self.store is None:
            raise RuntimeError("call ingest() before query()")
        hits = self.store.similarity_search(question, k=k)
        return [h.page_content for h in hits]`;

const DASH_CODE = `"""Sentiment ops dashboard — FastAPI scoring endpoint + Streamlit view.
Model: distilbert-sst2 · budget ceiling: 500ms p95 per score.
"""
from __future__ import annotations
import logging
from fastapi import FastAPI
from transformers import pipeline

logger = logging.getLogger("sentiment-ops")
app = FastAPI(title="sentiment-ops")
classify = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english",
)

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/score")
def score(text: str) -> dict:
    if not text or len(text) > 4000:
        raise ValueError("text must be 1..4000 chars")
    out = classify(text[:4000])[0]
    logger.info("scored label=%s", out["label"])
    return {"label": out["label"], "score": round(out["score"], 4)}`;

const SCRAPE_CODE = `"""News scraper — polite crawling: robots.txt + rate limiting.
UA identifies the bot; delay 1.5s; hard 10s timeout per fetch.
"""
from __future__ import annotations
import time, logging
from dataclasses import dataclass
from urllib import robotparser
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("crawl")

@dataclass
class Article:
    title: str
    url: str

class PoliteScraper:
    """Respects robots.txt; never fires parallel requests."""

    def __init__(self, base: str, delay: float = 1.5, timeout: int = 10) -> None:
        self.base, self.delay, self.timeout = base, delay, timeout
        self.session = requests.Session()
        self.session.headers["User-Agent"] = "swarmsys-ai-demo/0.9 (+edu)"
        self.robots = robotparser.RobotFileParser(f"{base}/robots.txt")
        self.robots.read()

    def fetch(self, path: str) -> str:
        url = f"{self.base}{path}"
        if not self.robots.can_fetch("*", url):
            raise PermissionError(f"robots.txt forbids {url}")
        time.sleep(self.delay)
        res = self.session.get(url, timeout=self.timeout)
        res.raise_for_status()
        return res.text

    def parse_articles(self, html: str) -> list[Article]:
        soup = BeautifulSoup(html, "html.parser")
        return [
            Article(a.get_text(strip=True), a["href"])
            for a in soup.select("article h2 a")
        ]`;

const FORECAST_CODE = `"""Demand forecasting — weekly series, SARIMAX with holdout.
Baseline: seasonal naive. Target: sMAPE <= 12% on 8-week holdout.
"""
from __future__ import annotations
import logging
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

logger = logging.getLogger("forecast")

def smape(y_true: pd.Series, y_pred: pd.Series) -> float:
    num = (y_true - y_pred).abs()
    den = (y_true.abs() + y_pred.abs()) / 2
    return float(200 * (num / den.replace(0, 1)).mean())

def fit_forecast(series: pd.Series, horizon: int = 8) -> pd.Series:
    if len(series) < 3 * horizon:
        raise ValueError("need >= 3x horizon of history")
    train, test = series[:-horizon], series[-horizon:]
    model = SARIMAX(
        train, order=(1, 1, 1),
        seasonal_order=(1, 1, 1, 52),
        enforce_stationarity=False,
    ).fit(disp=False)
    pred = model.forecast(horizon)
    err = smape(test, pred)
    logger.info("holdout sMAPE=%.1f%%", err)
    return pred`;

const GENERIC_CODE = `"""Task runner scaffold generated from the approved plan.
Fill each step with the concrete integration the plan calls for.
"""
from __future__ import annotations
import logging
from dataclasses import dataclass, field

logger = logging.getLogger("task")

@dataclass
class StepResult:
    name: str
    ok: bool
    detail: str = ""

@dataclass
class Runner:
    results: list[StepResult] = field(default_factory=list)

    def run(self, name: str, fn) -> StepResult:
        try:
            detail = fn()
            res = StepResult(name, True, str(detail))
        except Exception as exc:  # noqa: BLE001 - report, don't crash
            logger.exception("step %s failed", name)
            res = StepResult(name, False, repr(exc))
        self.results.append(res)
        return res

    def summary(self) -> dict:
        ok = sum(r.ok for r in self.results)
        return {"total": len(self.results), "ok": ok,
                "failed": len(self.results) - ok}`;

export const DOMAINS: DomainDef[] = [
  {
    id: "spam",
    label: "Classification",
    title: "spam email detector",
    keywords: ["spam", "classif", "detect", "filter", "toxic", "moderat", "fraud", "categoriz"],
    scope: "binary spam/ham classifier behind a typed /predict API, baseline first, BERT as v2",
    subtasks: [
      { text: "Survey classifiers & public email corpora", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Fix evaluation protocol: split, metrics, baseline bar", owner: "research", tools: ["knowledge_base", "calculator"] },
      { text: "Implement TF-IDF + NB training & inference pipeline", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Wrap model in validated /predict API contract", owner: "coder", tools: ["python_exec"] },
      { text: "Lint, run tests, score the build", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Assemble README, metrics table, deploy steps", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      tools: [
        { tool: "web_search", arg: "spam classification benchmark 2025", result: "4 sources · top: scikit-learn user guide" },
        { tool: "knowledge_base", arg: "public email corpora", result: "3 datasets · Enron-Spam, Ling-Spam, ClueWeb" },
        { tool: "calculator", arg: "18014 / 51730", result: "0.348 → 35% spam prior" },
      ],
      lines: [
        { kind: "info", text: "Baseline: MultinomialNB over TF-IDF — fast, and historically hard to beat on email (Drucker et al.)." },
        { kind: "info", text: "Step-up: fine-tuned DistilBERT lifts F1 ~2–3 pts on mixed corpora, at ~40× inference cost." },
        { kind: "data", text: "dataset: Enron-Spam v2 — 51,730 mails (33,716 ham / 18,014 spam), pre-cleaned." },
        { kind: "data", text: "alt: Ling-Spam (2,893 mails) for low-resource smoke tests." },
        { kind: "info", text: "35% spam prior → report PR-AUC, not accuracy; tune threshold on a validation slice." },
        { kind: "warn", text: "concept drift: spammers rephrase weekly — schedule monthly refits." },
        { kind: "good", text: "consensus: ship NB baseline behind /predict; queue DistilBERT as v2." },
      ],
      memory: [
        { key: "research.model", value: "MultinomialNB + TF-IDF (v1); DistilBERT queued as v2" },
        { key: "research.dataset", value: "Enron-Spam v2 · 51,730 mails · 35% spam" },
        { key: "research.metrics", value: "PR-AUC primary · macro-F1 secondary · 80/20 stratified" },
      ],
    },
    coding: {
      pre: [
        { kind: "info", text: "stack locked by RESEARCH → MultinomialNB + TF-IDF on Enron-Spam v2" },
        { kind: "info", text: "contract: predict(email: str) -> Verdict(label, confidence)" },
      ],
      file: "src/spam_detector.py",
      code: SPAM_CODE,
      testResult: "pytest -q → 7 passed in 0.42s",
      post: [{ kind: "good", text: "tests green: pipeline fit, shape-mismatch guard, verdict serialization" }],
      memory: [
        { key: "code.file", value: "src/spam_detector.py · 57 lines" },
        { key: "code.tests", value: "7 passed · 0 failed · coverage 91%" },
      ],
    },
    review: {
      first: [
        { kind: "good", text: "✓ docstrings on module, class and hot paths" },
        { kind: "good", text: "✓ stratified split + fixed seed → reproducible holdout" },
        { kind: "warn", text: "! predict() accepts empty string — should raise" },
        { kind: "warn", text: "! no structured logging on the inference path" },
      ],
      patch: [
        'if not email.strip(): raise ValueError("email must not be empty")',
        'logger.debug("predict label=%s conf=%.3f", v.label, v.confidence)',
      ],
      second: [
        { kind: "good", text: "✓ re-review: both flags resolved by patch" },
        { kind: "good", text: "✓ lint clean · mypy clean · tests still green" },
      ],
      baseScore: 84,
    },
    report: {
      findings: [
        "MultinomialNB + TF-IDF is the cost-optimal baseline for email-scale spam filtering.",
        "Enron-Spam v2 (51,730 mails) gives a realistic 35% positive prior.",
        "PR-AUC is the honest headline metric at this class imbalance.",
      ],
      deploy: [
        "Package: `pip install scikit-learn fastapi uvicorn` — no GPU required.",
        "Serve: `uvicorn api:app --workers 2` behind any reverse proxy.",
        "Operate: monthly refit cron + drift alert when spam-share moves ±5 pts.",
      ],
      risks: [
        "Concept drift after ~4 weeks without refit.",
        "Adversarial misspellings evade n-gram features (v2 BERT mitigates).",
      ],
    },
  },
  {
    id: "chatbot",
    label: "Conversational AI",
    title: "support chatbot with memory",
    keywords: ["chatbot", "chat bot", "assistant", "support agent", "conversation", "copilot"],
    scope: "LangGraph support agent with per-thread memory, docs retrieval and a human-handoff rule",
    subtasks: [
      { text: "Compare LLM hosting options & memory strategies", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Define handoff policy + guardrails for billing/deletion", owner: "research", tools: ["knowledge_base"] },
      { text: "Implement LangGraph agent with checkpointer memory", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Wire retrieval tool over the docs vector store", owner: "coder", tools: ["vector_db", "python_exec"] },
      { text: "Lint, run tests, score the build", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Assemble README, prompt card, deploy steps", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      tools: [
        { tool: "web_search", arg: "LangGraph vs CrewAI agents 2025", result: "5 sources · top: LangGraph persistence docs" },
        { tool: "knowledge_base", arg: "conversation memory patterns", result: "4 patterns · buffer / summary / vector / hybrid" },
        { tool: "vector_db", arg: "count(docs.chunks)", result: "2,412 chunks indexed" },
      ],
      lines: [
        { kind: "info", text: "Framework: LangGraph — checkpointer gives thread memory for free; CrewAI fits role-play pipelines better, not support." },
        { kind: "info", text: "Memory: summary-buffer (last 10 turns verbatim + rolling summary) beats unbounded buffer on cost and recall." },
        { kind: "data", text: "llm: gpt-4o-mini primary · llama3.1:8b local fallback · docs: 2,412 chunks already indexed." },
        { kind: "info", text: "Guardrail: any billing or data-deletion intent → deterministic handoff, no model discretion." },
        { kind: "warn", text: "summary memory can launder facts — pin order IDs with a regex tool call." },
        { kind: "good", text: "consensus: react agent + MemorySaver + one retrieval tool + hard handoff rule." },
      ],
      memory: [
        { key: "research.framework", value: "LangGraph react agent · MemorySaver checkpointer" },
        { key: "research.llm", value: "gpt-4o-mini (fallback: llama3.1:8b local)" },
        { key: "research.guardrail", value: "billing/deletion intents → forced human handoff" },
      ],
    },
    coding: {
      pre: [
        { kind: "info", text: "stack locked by RESEARCH → LangGraph + MemorySaver + gpt-4o-mini" },
        { kind: "info", text: "contract: ask(agent, thread_id, question) -> str" },
      ],
      file: "src/chatbot.py",
      code: CHAT_CODE,
      testResult: "pytest -q → 6 passed in 1.18s",
      post: [{ kind: "good", text: "tests green: memory recall across turns, empty-input guard, handoff stub" }],
      memory: [
        { key: "code.file", value: "src/chatbot.py · 44 lines" },
        { key: "code.tests", value: "6 passed · memory-recall test included" },
      ],
    },
    review: {
      first: [
        { kind: "good", text: "✓ system prompt pins tone, citation and handoff rule" },
        { kind: "good", text: "✓ checkpointer keyed by thread_id — memory is per-user" },
        { kind: "warn", text: "! ask() accepted whitespace-only questions" },
        { kind: "warn", text: "! no observability on invoke — add a turn log line" },
      ],
      patch: [
        'if not question.strip(): raise ValueError("question must not be empty")',
        'logger.info("thread=%s turns ok", thread_id)',
      ],
      second: [
        { kind: "good", text: "✓ re-review: input guard + turn logging in place" },
        { kind: "good", text: "✓ handoff rule tested against 12 adversarial phrasings" },
      ],
      baseScore: 82,
    },
    report: {
      findings: [
        "LangGraph's checkpointer is the lowest-effort path to per-thread memory.",
        "Summary-buffer memory controls cost without losing recall past ~10 turns.",
        "Deterministic handoff rules outperform model-judged escalation on safety.",
      ],
      deploy: [
        "Run: `uvicorn api:app` with OPENAI_API_KEY set; fallback needs Ollama on :11434.",
        "Swap MemorySaver → PostgresSaver for durable, multi-instance memory.",
        "Watch: handoff rate and median turns-to-resolution per week.",
      ],
      risks: [
        "Summary memory can drift from the literal transcript.",
        "Model latency tail (p99) drives user drop-off more than accuracy.",
      ],
    },
  },
  {
    id: "rag",
    label: "Retrieval (RAG)",
    title: "RAG Q&A over documents",
    keywords: ["rag", "pdf", "document", "knowledge base", "q&a", "qa over", "retrieval"],
    scope: "chunk → embed → retrieve pipeline over PDFs with reranking and cited answers",
    subtasks: [
      { text: "Compare chunking, embedders and vector stores", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Define retrieval eval: recall@4 + citation rate", owner: "research", tools: ["knowledge_base", "calculator"] },
      { text: "Implement ingest pipeline (PDF → chunks → Chroma)", owner: "coder", tools: ["file_io", "vector_db"] },
      { text: "Implement query path with similarity search", owner: "coder", tools: ["vector_db", "python_exec"] },
      { text: "Lint, run tests, score the build", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Assemble README, eval sheet, deploy steps", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      tools: [
        { tool: "web_search", arg: "MTEB embedding leaderboard small models", result: "bge-small-en-v1.5 top of <110M class" },
        { tool: "knowledge_base", arg: "chunking strategies pdf", result: "512 tokens / 64 overlap wins for mixed layouts" },
        { tool: "sql_query", arg: "SELECT count(*) FROM docs", result: "148 files · 3,902 pages" },
      ],
      lines: [
        { kind: "info", text: "Chunks: 512 tokens with 64 overlap — best recall/latency trade on mixed PDF layouts." },
        { kind: "info", text: "Embedder: bge-small-en-v1.5 (110M) — CPU-friendly, tops its MTEB weight class." },
        { kind: "data", text: "store: Chroma local for dev → pgvector in prod (SQL ops team already runs Postgres)." },
        { kind: "info", text: "Eval: recall@4 on 60 hand-written questions; require a cited chunk per answer." },
        { kind: "warn", text: "scanned PDFs need OCR pre-pass — flag ~12% of corpus as image-only." },
        { kind: "good", text: "consensus: RecursiveCharacterSplitter 512/64 + bge-small + recall@4 gate." },
      ],
      memory: [
        { key: "research.chunking", value: "512 tokens / 64 overlap · RecursiveCharacterSplitter" },
        { key: "research.embedder", value: "bge-small-en-v1.5 · CPU inference" },
        { key: "research.store", value: "Chroma (dev) → pgvector (prod)" },
      ],
    },
    coding: {
      pre: [
        { kind: "info", text: "stack locked by RESEARCH → 512/64 chunks, bge-small, Chroma" },
        { kind: "info", text: "contract: DocIndex.ingest(pdf) -> n_chunks · .query(q) -> chunks" },
      ],
      file: "src/doc_index.py",
      code: RAG_CODE,
      testResult: "pytest -q → 8 passed in 3.05s",
      post: [{ kind: "good", text: "tests green: ingest guard, chunk count, recall@4 on fixture corpus" }],
      memory: [
        { key: "code.file", value: "src/doc_index.py · 47 lines" },
        { key: "code.tests", value: "8 passed · recall@4 = 0.91 on fixtures" },
      ],
    },
    review: {
      first: [
        { kind: "good", text: "✓ missing-file and empty-store guards raise clean errors" },
        { kind: "good", text: "✓ embedder pinned by name — no silent model swaps" },
        { kind: "warn", text: "! query() before ingest() raised AttributeError, not a message" },
        { kind: "warn", text: "! ingest result (chunk count) not logged" },
      ],
      patch: [
        'if self.store is None: raise RuntimeError("call ingest() before query()")',
        "# chunk count returned to caller for logging/alerting",
      ],
      second: [
        { kind: "good", text: "✓ re-review: state errors now explicit and testable" },
        { kind: "good", text: "✓ recall@4 = 0.91 clears the 0.85 gate" },
      ],
      baseScore: 83,
    },
    report: {
      findings: [
        "512/64 chunking is the safe default for heterogeneous PDF corpora.",
        "bge-small keeps retrieval on CPU — no GPU line item.",
        "recall@4 = 0.91 on fixtures; production gate set at 0.85.",
      ],
      deploy: [
        "Dev: Chroma persists to ./vec — zero setup.",
        "Prod: same code against pgvector via the LangChain PG embedder.",
        "Nightly re-ingest cron for the 148-file corpus (~9 min on CPU).",
      ],
      risks: [
        "12% of corpus is scanned images — needs OCR before it's searchable.",
        "Embedding model upgrades require a full re-index.",
      ],
    },
  },
  {
    id: "dashboard",
    label: "Analytics",
    title: "sentiment ops dashboard",
    keywords: ["dashboard", "sentiment", "analytics", "visuali", "metrics", "kpi", "tickets"],
    scope: "FastAPI scoring endpoint + live dashboard over support-ticket sentiment",
    subtasks: [
      { text: "Pick sentiment model + latency budget", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Define KPI set: volume, neg-share, response lag", owner: "research", tools: ["sql_query"] },
      { text: "Implement /score endpoint with validation", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Implement Streamlit view over scored tickets", owner: "coder", tools: ["python_exec"] },
      { text: "Lint, run tests, score the build", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Assemble README, KPI dictionary, deploy steps", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      tools: [
        { tool: "web_search", arg: "distilbert sst2 latency cpu benchmark", result: "p50 38ms · p95 210ms on 4 vCPU" },
        { tool: "sql_query", arg: "SELECT count(*) FROM tickets WHERE created > now()-'30d'", result: "18,440 tickets / 30d" },
        { tool: "knowledge_base", arg: "ops dashboard KPI patterns", result: "volume · neg-share · first-response lag" },
      ],
      lines: [
        { kind: "info", text: "Model: distilbert-sst2 — p95 210ms on CPU, comfortably inside the 500ms budget." },
        { kind: "data", text: "volume: 18,440 tickets / 30 days → score in nightly batch + live /score for new ones." },
        { kind: "info", text: "KPIs: ticket volume, negative-share trend, first-response lag by sentiment band." },
        { kind: "warn", text: "sarcastic tickets read as positive — cap confidence display at 'signal, not truth'." },
        { kind: "good", text: "consensus: batch + live hybrid scoring; three-KPI dashboard; no GPU." },
      ],
      memory: [
        { key: "research.model", value: "distilbert-sst2 · p95 210ms CPU" },
        { key: "research.volume", value: "18,440 tickets / 30d · batch + live scoring" },
        { key: "research.kpis", value: "volume · negative-share · response lag" },
      ],
    },
    coding: {
      pre: [
        { kind: "info", text: "stack locked by RESEARCH → distilbert-sst2 behind /score, 500ms budget" },
        { kind: "info", text: "contract: POST /score {text} -> {label, score}" },
      ],
      file: "src/sentiment_api.py",
      code: DASH_CODE,
      testResult: "pytest -q → 5 passed in 2.31s",
      post: [{ kind: "good", text: "tests green: length guard, health endpoint, label contract" }],
      memory: [
        { key: "code.file", value: "src/sentiment_api.py · 38 lines" },
        { key: "code.tests", value: "5 passed · p95 measured 236ms" },
      ],
    },
    review: {
      first: [
        { kind: "good", text: "✓ explicit 4000-char cap matches the batch column size" },
        { kind: "good", text: "✓ /health exists for the load balancer" },
        { kind: "warn", text: "! /score returned 200 with an error body — should raise 4xx" },
        { kind: "warn", text: "! no log line on score — ops can't trace a bad batch" },
      ],
      patch: [
        "raise ValueError(\"text must be 1..4000 chars\")  # → FastAPI 422",
        'logger.info("scored label=%s", out["label"])',
      ],
      second: [
        { kind: "good", text: "✓ re-review: invalid input now returns a proper 4xx" },
        { kind: "good", text: "✓ p95 236ms verified under 20-concurrent load" },
      ],
      baseScore: 85,
    },
    report: {
      findings: [
        "distilbert-sst2 clears the 500ms budget on plain CPU (p95 236ms measured).",
        "18k tickets/month is batch-friendly — nightly scoring keeps cost flat.",
        "Three KPIs beat thirty: volume, negative-share, response lag.",
      ],
      deploy: [
        "API: `uvicorn sentiment_api:app`; Streamlit: `streamlit run dash.py`.",
        "One container, two processes via supervisord or two Render services.",
        "Alert: negative-share > 2σ of its 28-day rolling mean.",
      ],
      risks: [
        "Sarcasm and quoted customer text skew labels — treat as signal.",
        "Model version bumps shift the score distribution; pin versions.",
      ],
    },
  },
  {
    id: "scraper",
    label: "Data collection",
    title: "polite web scraper",
    keywords: ["scrap", "crawl", "extract", "collect data", "harvest"],
    scope: "rate-limited, robots.txt-respecting scraper with typed article extraction",
    subtasks: [
      { text: "Check target's robots.txt & rate norms", owner: "research", tools: ["web_search"] },
      { text: "Define extraction schema + dedupe key", owner: "research", tools: ["knowledge_base", "sql_query"] },
      { text: "Implement polite fetcher (robots + delay)", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Implement typed parser with dedupe", owner: "coder", tools: ["python_exec"] },
      { text: "Lint, run tests, score the build", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Assemble README, cron plan, deploy steps", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      tools: [
        { tool: "web_search", arg: "target site robots.txt crawl-delay", result: "crawl-delay: 1 · /api/ disallowed" },
        { tool: "knowledge_base", arg: "polite crawling checklist", result: "UA string · timeout · retry-after · dedupe" },
        { tool: "sql_query", arg: "SELECT count(*) FROM articles", result: "existing store: 44,102 rows" },
      ],
      lines: [
        { kind: "info", text: "robots.txt allows article pages, disallows /api/; crawl-delay 1s — we run 1.5s to be boring." },
        { kind: "data", text: "schema: Article(title, url) · dedupe on normalized URL hash." },
        { kind: "info", text: "Existing store has 44,102 rows — incremental crawls only, never re-fetch known URLs." },
        { kind: "warn", text: "honor Retry-After on 429; three strikes → back off 1h and alert." },
        { kind: "good", text: "consensus: single-threaded polite crawler, identifiable UA, incremental only." },
      ],
      memory: [
        { key: "research.policy", value: "robots ok · crawl-delay 1.5s · /api/ off-limits" },
        { key: "research.schema", value: "Article(title, url) · dedupe on URL hash" },
        { key: "research.store", value: "44,102 existing rows · incremental crawl" },
      ],
    },
    coding: {
      pre: [
        { kind: "info", text: "stack locked by RESEARCH → robots-first fetcher, 1.5s delay, URL-hash dedupe" },
        { kind: "info", text: "contract: PoliteScraper.fetch(path) / .parse_articles(html)" },
      ],
      file: "src/scraper.py",
      code: SCRAPE_CODE,
      testResult: "pytest -q → 6 passed in 0.64s",
      post: [{ kind: "good", text: "tests green: robots denial raises, delay respected, parser typed" }],
      memory: [
        { key: "code.file", value: "src/scraper.py · 51 lines" },
        { key: "code.tests", value: "6 passed · robots-mock included" },
      ],
    },
    review: {
      first: [
        { kind: "good", text: "✓ User-Agent identifies the bot — site ops can reach us" },
        { kind: "good", text: "✓ robots.txt parsed per URL, not once globally" },
        { kind: "warn", text: "! timeout errors crashed the crawl loop" },
        { kind: "warn", text: "! no retry budget for transient 5xx" },
      ],
      patch: [
        "res = self.session.get(url, timeout=self.timeout)  # raises → caller retries ≤2",
        "res.raise_for_status()  # 429 handled by caller via Retry-After",
      ],
      second: [
        { kind: "good", text: "✓ re-review: transient failures contained, retry budget documented" },
        { kind: "good", text: "✓ 60-URL dry run: zero 429s, zero dupes" },
      ],
      baseScore: 81,
    },
    report: {
      findings: [
        "Politeness is a feature: identifiable UA + 1.5s delay got zero blocks in dry run.",
        "Incremental crawling against 44k known rows keeps load near zero.",
        "URL-hash dedupe is cheaper and safer than content hashing here.",
      ],
      deploy: [
        "Cron: hourly incremental crawl via any scheduler; single worker only.",
        "Store rows through the existing ingestion API — no new infra.",
        "Alert on three consecutive 429s; auto-pause 1h.",
      ],
      risks: [
        "Layout changes silently break the selector — monitor zero-result runs.",
        "Terms-of-service review recommended before production scale.",
      ],
    },
  },
  {
    id: "forecast",
    label: "Forecasting",
    title: "demand forecasting",
    keywords: ["forecast", "predict demand", "time series", "demand", "projection"],
    scope: "weekly demand forecast, SARIMAX vs seasonal-naive with an sMAPE gate",
    subtasks: [
      { text: "Inspect series: seasonality, gaps, outliers", owner: "research", tools: ["sql_query", "calculator"] },
      { text: "Pick baseline + error metric and gate", owner: "research", tools: ["knowledge_base"] },
      { text: "Implement SARIMAX fit/forecast with holdout", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Implement sMAPE scoring vs baseline", owner: "coder", tools: ["python_exec"] },
      { text: "Lint, run tests, score the build", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Assemble README, backtest sheet, deploy steps", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      tools: [
        { tool: "sql_query", arg: "SELECT min(created), max(created), count(*) FROM orders", result: "156 weeks · 3 gaps · no outliers >4σ" },
        { tool: "knowledge_base", arg: "weekly demand baselines", result: "seasonal naive first, SARIMAX second" },
        { tool: "calculator", arg: "156 / 8", result: "19.5 → 19 retrain windows available" },
      ],
      lines: [
        { kind: "data", text: "series: 156 weekly points, strong yearly seasonality, 3 small gaps (interpolate)." },
        { kind: "info", text: "Baseline: seasonal naive. If SARIMAX can't beat it by 2+ sMAPE pts, ship the baseline." },
        { kind: "info", text: "Metric: sMAPE on an 8-week rolling holdout; gate ≤ 12%." },
        { kind: "warn", text: "promo spikes are exogenous — without a promo calendar, forecast the baseline demand only." },
        { kind: "good", text: "consensus: SARIMAX(1,1,1)(1,1,1,52) vs seasonal naive, sMAPE gate 12%." },
      ],
      memory: [
        { key: "research.series", value: "156 weekly points · yearly seasonality · 3 gaps" },
        { key: "research.model", value: "SARIMAX(1,1,1)(1,1,1,52) vs seasonal naive" },
        { key: "research.metric", value: "sMAPE ≤ 12% on 8-week holdout" },
      ],
    },
    coding: {
      pre: [
        { kind: "info", text: "stack locked by RESEARCH → SARIMAX with seasonal-naive baseline" },
        { kind: "info", text: "contract: fit_forecast(series, horizon=8) -> pd.Series" },
      ],
      file: "src/forecast.py",
      code: FORECAST_CODE,
      testResult: "pytest -q → 5 passed in 4.12s",
      post: [{ kind: "good", text: "tests green: history guard, sMAPE math, holdout leak check" }],
      memory: [
        { key: "code.file", value: "src/forecast.py · 41 lines" },
        { key: "code.tests", value: "5 passed · holdout sMAPE 10.8%" },
      ],
    },
    review: {
      first: [
        { kind: "good", text: "✓ holdout is strictly future data — no leakage" },
        { kind: "good", text: "✓ sMAPE guards divide-by-zero explicitly" },
        { kind: "warn", text: "! short-history input raised a raw statsmodels error" },
        { kind: "warn", text: "! fit result not logged — backtests are untraceable" },
      ],
      patch: [
        'if len(series) < 3 * horizon: raise ValueError("need >= 3x horizon of history")',
        'logger.info("holdout sMAPE=%.1f%%", err)',
      ],
      second: [
        { kind: "good", text: "✓ re-review: friendly guard + traceable backtest log" },
        { kind: "good", text: "✓ sMAPE 10.8% beats the 12% gate and the naive baseline (13.1%)" },
      ],
      baseScore: 84,
    },
    report: {
      findings: [
        "SARIMAX beats seasonal naive by 2.3 sMAPE points — worth the dependency.",
        "8-week holdout sMAPE 10.8% clears the 12% gate.",
        "Promo effects are out of scope until a promo calendar exists.",
      ],
      deploy: [
        "Nightly refit on the last 156 weeks; publish 8-week-ahead CSV.",
        "Pin statsmodels — forecast outputs are version-sensitive.",
        "Backtest dashboard: rolling sMAPE per retrain window.",
      ],
      risks: [
        "Structural breaks (price changes) invalidate the fit until refit.",
        "Gap interpolation slightly understates uncertainty bands.",
      ],
    },
  },
  {
    id: "generic",
    label: "General build",
    title: "task runner",
    keywords: [],
    scope: "typed scaffold with per-step error capture, tests, and a summary contract",
    subtasks: [
      { text: "Scope the goal into testable steps", owner: "research", tools: ["web_search", "knowledge_base"] },
      { text: "Fix the done-criteria per step", owner: "research", tools: ["knowledge_base"] },
      { text: "Implement the typed runner scaffold", owner: "coder", tools: ["python_exec", "file_io"] },
      { text: "Add step-level error capture + summary", owner: "coder", tools: ["python_exec"] },
      { text: "Lint, run tests, score the build", owner: "reviewer", tools: ["code_lint", "python_exec"] },
      { text: "Assemble README + extension guide", owner: "reporter", tools: ["file_io"] },
    ],
    research: {
      tools: [
        { tool: "web_search", arg: "task pipeline error-handling patterns python", result: "3 sources · per-step capture + summary" },
        { tool: "knowledge_base", arg: "scaffold conventions", result: "dataclass results · typed contract · logging" },
      ],
      lines: [
        { kind: "info", text: "No exact domain match — falling back to a general engineering scaffold." },
        { kind: "info", text: "Pattern: one dataclass per step result, errors captured not raised, summary at the end." },
        { kind: "data", text: "done-criteria: every step returns (ok, detail); summary is a plain dict." },
        { kind: "warn", text: "scope risk: underspecified goals rot — reporter must list open questions." },
        { kind: "good", text: "consensus: ship the scaffold; each concrete integration becomes one Runner.run() call." },
      ],
      memory: [
        { key: "research.pattern", value: "per-step capture · typed results · dict summary" },
        { key: "research.done", value: "every step → (ok, detail); no silent skips" },
      ],
    },
    coding: {
      pre: [
        { kind: "info", text: "stack locked by RESEARCH → dataclass scaffold with error capture" },
        { kind: "info", text: "contract: Runner.run(name, fn) -> StepResult · .summary() -> dict" },
      ],
      file: "src/runner.py",
      code: GENERIC_CODE,
      testResult: "pytest -q → 4 passed in 0.21s",
      post: [{ kind: "good", text: "tests green: success path, failure path, summary math" }],
      memory: [
        { key: "code.file", value: "src/runner.py · 39 lines" },
        { key: "code.tests", value: "4 passed · failure path covered" },
      ],
    },
    review: {
      first: [
        { kind: "good", text: "✓ failures are data, not crashes — the run always completes" },
        { kind: "good", text: "✓ logger.exception keeps tracebacks for ops" },
        { kind: "warn", text: "! bare `except Exception` needs a noqa comment explaining why" },
        { kind: "warn", text: "! summary() returned floats for counts in an early draft" },
      ],
      patch: [
        "except Exception as exc:  # noqa: BLE001 - report, don't crash",
        '"failed": len(self.results) - ok  # int arithmetic only',
      ],
      second: [
        { kind: "good", text: "✓ re-review: intent documented, types tight" },
        { kind: "good", text: "✓ scaffold extends cleanly — one call per concrete step" },
      ],
      baseScore: 80,
    },
    report: {
      findings: [
        "Per-step error capture keeps long runs diagnosable end-to-end.",
        "A dict summary contract stays portable across consumers.",
      ],
      deploy: [
        "Drop src/runner.py into any project; zero dependencies.",
        "Wire concrete steps as Runner.run() calls in execution order.",
        "Emit the summary dict to logs or a metrics sink.",
      ],
      risks: [
        "Underspecified goal — open questions listed for the operator.",
        "Scaffold is only as good as the steps wired into it.",
      ],
    },
  },
];

export function detectDomain(task: string): DomainDef {
  const t = task.toLowerCase();
  for (const d of DOMAINS) {
    if (d.id === "generic") continue;
    if (d.keywords.some((k) => t.includes(k))) return d;
  }
  return DOMAINS.find((d) => d.id === "generic") ?? DOMAINS[0];
}

/* ————— sample prompts for the operator console ————— */
export const SAMPLE_TASKS = [
  "Build a spam email detector",
  "Create an AI support chatbot with memory",
  "RAG question-answering over our PDFs",
  "Sentiment dashboard for support tickets",
  "Polite news scraper with rate limits",
  "Forecast weekly product demand",
];

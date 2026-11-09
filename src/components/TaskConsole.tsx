import { useEffect, useState } from "react";
import { AGENTS, HF_MODELS, PRESETS, type Preset } from "../lib/knowledge";
import { checkBackendHealth, getApiBaseUrl, setApiBaseUrl, type EngineMode } from "../lib/liveEngine";
import type { AgentId, Phase } from "../lib/types";
import { Icon } from "../lib/ui";

const ROLE_COLOR: Record<string, string> = {
  reasoning: "var(--c-research)",
  code: "var(--c-coder)",
  general: "var(--c-amber)",
  edge: "var(--mut)",
};

export interface FlagshipModelSpec {
  id: string;
  label: string;
  arch: string;
  ctx: string;
  role: "reasoning" | "code" | "general" | "edge";
  specialist: AgentId;
  badge: string;
}

export const UPGRADED_SWARM_MODELS: FlagshipModelSpec[] = [
  {
    id: "Qwen/Qwen3-235B-A22B-Thinking-2507",
    label: "Qwen3 235B-A22B Thinking",
    arch: "235B MoE (22B active · 128 experts)",
    ctx: "256K native",
    role: "reasoning",
    specialist: "planner",
    badge: "CoT DAG Planner",
  },
  {
    id: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    label: "Llama 4 Scout 17B×16E",
    arch: "109B MoE (17B active · 16 experts)",
    ctx: "10M extended",
    role: "reasoning",
    specialist: "research",
    badge: "Long-Context Synthesis",
  },
  {
    id: "deepseek-ai/DeepSeek-V4-Flash",
    label: "DeepSeek V4 Flash",
    arch: "MoE Sparse Attention (27% FLOPs)",
    ctx: "1M native",
    role: "code",
    specialist: "coder",
    badge: "Primary Codegen",
  },
  {
    id: "Qwen/Qwen3.5-35B-A3B",
    label: "Qwen3.5 35B-A3B",
    arch: "35B MoE (3B active)",
    ctx: "128K native",
    role: "edge",
    specialist: "qa",
    badge: "High-Speed Test Matrix",
  },
  {
    id: "Qwen/Qwen3-235B-A22B-Instruct-2507",
    label: "Qwen3 235B-A22B Instruct",
    arch: "235B MoE (22B active)",
    ctx: "256K→1M",
    role: "general",
    specialist: "reviewer",
    badge: "Strict ≥85 Gate Auditor",
  },
  {
    id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
    label: "Llama 4 Maverick 17B×128E",
    arch: "400B MoE (17B active · 128 experts)",
    ctx: "1M native",
    role: "reasoning",
    specialist: "security",
    badge: "SAST & Threat Triage",
  },
  {
    id: "deepseek-ai/DeepSeek-V3.1-Base",
    label: "DeepSeek V3.1 Hybrid-Think",
    arch: "671B MoE (37B active · UE8M0 FP8)",
    ctx: "128K native",
    role: "code",
    specialist: "debugger",
    badge: "Traceback Auto-Patcher",
  },
  {
    id: "google/gemma-3-27b-it",
    label: "Gemma 3 27B-IT (QAT)",
    arch: "27B Dense (14T tokens)",
    ctx: "128K native",
    role: "general",
    specialist: "reporter",
    badge: "Executive Dossier Synthesis",
  },
];

export default function TaskConsole({
  task,
  setTask,
  onRun,
  onAbort,
  onPreset,
  running,
  autoApprove,
  setAutoApprove,
  liveWeb,
  setLiveWeb,
  engineMode = "sim",
  setEngineMode,
  modelId,
  setModelId,
  phase,
}: {
  task: string;
  setTask: (v: string) => void;
  onRun: () => void;
  onAbort: () => void;
  onPreset: (p: Preset) => void;
  running: boolean;
  autoApprove: boolean;
  setAutoApprove: (v: boolean) => void;
  liveWeb: boolean;
  setLiveWeb: (v: boolean) => void;
  engineMode?: EngineMode;
  setEngineMode?: (v: EngineMode) => void;
  modelId: string;
  setModelId: (v: string) => void;
  phase: Phase;
}) {
  const canRun = task.trim().length > 0 && !running;
  const isLiveApi = engineMode === "live";
  const [apiUrl, setApiUrl] = useState<string>(() => getApiBaseUrl());
  const [health, setHealth] = useState<{ status: "idle" | "checking" | "online" | "offline"; ms?: number }>({
    status: "idle",
  });
  const [showRoutingMatrix, setShowRoutingMatrix] = useState(false);

  const pingHealth = async (targetUrl?: string) => {
    const clean = setApiBaseUrl(targetUrl ?? apiUrl);
    setApiUrl(clean);
    setHealth({ status: "checking" });
    const res = await checkBackendHealth(clean);
    setHealth({ status: res.ok ? "online" : "offline", ms: res.latencyMs });
  };

  useEffect(() => {
    if (isLiveApi) {
      void pingHealth(apiUrl);
    }
  }, [isLiveApi]);

  return (
    <div className="border-2 border-line bg-panel transition-colors duration-300 focus-within:border-amber">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-3">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-mut">
            <Icon name="terminal" className="h-3.5 w-3.5 text-amber" />
            Operator input
          </p>
          <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mut">
            {isLiveApi ? "langgraph sse runtime" : "deterministic browser sim"}
          </span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
          {running ? (
            <span className="text-amber">
              phase: {phase}
              <span className="blink ml-1 inline-block h-2.5 w-1.5 translate-y-[1px] bg-amber" />
            </span>
          ) : phase === "complete" ? (
            <span className="text-coder">last run: complete</span>
          ) : (
            "swarm idle — feed it a goal"
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2.5 border border-line bg-bg px-3.5 py-3 transition-colors focus-within:border-amber/60">
          <span className="font-mono text-sm text-amber">&gt;</span>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canRun) onRun();
            }}
            placeholder="Describe the task — e.g. build a distributed token-bucket rate limiter"
            aria-label="Task for the swarm"
            className="w-full bg-transparent font-mono text-base text-ink outline-none md:text-sm"
          />
        </div>
        <div className="flex flex-wrap items-stretch gap-2.5">
          {running ? (
            <button
              onClick={onAbort}
              className="flex h-[46px] flex-1 touch-manipulation items-center justify-center gap-2 border-2 border-amber/70 bg-amber/10 px-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber hover:bg-amber/20"
            >
              <Icon name="stop" className="h-4 w-4" />
              Abort
            </button>
          ) : (
            <button
              onClick={onRun}
              disabled={!canRun}
              className="flex h-[46px] flex-1 touch-manipulation items-center justify-center gap-2.5 bg-amber px-6 font-mono text-xs font-bold uppercase tracking-[0.2em] text-bg transition-all duration-200 hover:brightness-110 disabled:opacity-40"
            >
              <Icon name="play" className="h-4 w-4" />
              Run swarm
            </button>
          )}
          <button
            onClick={() => setAutoApprove(!autoApprove)}
            role="switch"
            aria-checked={autoApprove}
            title="Skip the human-approval gate"
            className={`flex h-[46px] flex-1 touch-manipulation items-center justify-center gap-2.5 border px-3.5 font-mono text-xs uppercase tracking-wider transition-colors ${
              autoApprove
                ? "border-amber/60 bg-amber/10 text-amber"
                : "border-line text-mut hover:border-line2 hover:text-ink"
            }`}
          >
            <span
              className={`relative h-3.5 w-7 border transition-colors ${autoApprove ? "border-amber" : "border-line"}`}
            >
              <span
                className={`absolute top-[-2px] h-2 w-2 transition-all duration-200 ${
                  autoApprove ? "left-[16px] bg-amber" : "left-[2px] bg-mut"
                }`}
              />
            </span>
            auto-approve
          </button>
          <button
            onClick={() => setLiveWeb(!liveWeb)}
            role="switch"
            aria-checked={liveWeb}
            title="Agents query live Wikipedia, GitHub, HF hub and OSV.dev"
            className={`flex h-[46px] flex-1 touch-manipulation items-center justify-center gap-2.5 border px-3.5 font-mono text-xs uppercase tracking-wider transition-colors ${
              liveWeb
                ? "border-research/60 bg-research/10 text-research"
                : "border-line text-mut hover:border-line2 hover:text-ink"
            }`}
          >
            <span
              className={`relative h-3.5 w-7 border transition-colors ${liveWeb ? "border-research" : "border-line"}`}
            >
              <span
                className={`absolute top-[-2px] h-2 w-2 transition-all duration-200 ${
                  liveWeb ? "left-[16px] bg-research" : "left-[2px] bg-mut"
                }`}
              />
            </span>
            live web
          </button>
          {setEngineMode && (
            <button
              onClick={() => setEngineMode(isLiveApi ? "sim" : "live")}
              role="switch"
              aria-checked={isLiveApi}
              title="Switch between browser simulation (Sim) and FastAPI + LangGraph SSE backend (Live API)"
              className={`flex h-[46px] flex-1 touch-manipulation items-center justify-center gap-2.5 border px-3.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                isLiveApi
                  ? "border-coder/60 bg-coder/10 text-coder"
                  : "border-line text-mut hover:border-line2 hover:text-ink"
              }`}
            >
              <span
                className={`relative h-3.5 w-7 border transition-colors ${isLiveApi ? "border-coder" : "border-line"}`}
              >
                <span
                  className={`absolute top-[-2px] h-2 w-2 transition-all duration-200 ${
                    isLiveApi ? "left-[16px] bg-coder" : "left-[2px] bg-mut"
                  }`}
                />
              </span>
              engine: {isLiveApi ? "Live API" : "Sim"}
            </button>
          )}
        </div>
      </div>

      {/* Live API Endpoint Configuration & Health Bar */}
      {isLiveApi && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-bg/60 px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-coder">live backend url:</span>
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            onBlur={() => void pingHealth(apiUrl)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void pingHealth(apiUrl);
            }}
            aria-label="FastAPI Backend Base URL"
            className="min-w-[220px] flex-1 border border-line bg-panel px-2.5 py-1 font-mono text-xs text-ink outline-none focus:border-coder"
          />
          <button
            type="button"
            onClick={() => void pingHealth(apiUrl)}
            className="border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-mut hover:border-coder hover:text-coder"
          >
            ping /api/health
          </button>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider ${
              health.status === "online"
                ? "text-coder"
                : health.status === "offline"
                  ? "text-amber"
                  : "text-mut"
            }`}
          >
            {health.status === "online"
              ? `● online (${health.ms ?? 1}ms)`
              : health.status === "offline"
                ? "○ offline — start uvicorn server:app"
                : health.status === "checking"
                  ? "◌ checking..."
                  : ""}
          </span>
        </div>
      )}

      {/* Hugging Face model selector + 9-Specialist Routing Matrix drawer */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mut">lead model:</span>
        {HF_MODELS.map((m) => {
          const active = m.id === modelId;
          const rc = ROLE_COLOR[m.role];
          return (
            <button
              key={m.id}
              onClick={() => setModelId(m.id)}
              disabled={running}
              title={`${m.id} · ${m.role} · ${m.ctx} context · quality ×${m.quality} · speed ×${m.speed}`}
              className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] transition-all duration-200 ${
                active ? "bg-panel2" : "text-mut hover:border-line2 hover:text-ink"
              }`}
              style={
                active
                  ? { borderColor: rc, color: rc, boxShadow: `0 0 16px -8px ${rc}` }
                  : { borderColor: "var(--line)" }
              }
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "led-on" : ""}`}
                style={{ background: active ? rc : "var(--line2)" }}
              />
              {m.label}
              <span className="opacity-60">{m.params}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowRoutingMatrix((v) => !v)}
          className="ml-auto border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-amber transition-colors hover:border-amber/60 hover:bg-amber/10"
        >
          {showRoutingMatrix ? "hide specialist routing ▴" : "9-agent model routing ▾"}
        </button>
      </div>

      {/* Expandable Flagship MoE Specialist Routing Matrix */}
      {showRoutingMatrix && (
        <div className="border-t border-line bg-bg/50 px-4 py-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">
              upgraded 2026 open-weight specialist model stack (per-node routing)
            </p>
            <span className="font-mono text-[9.5px] text-mut">
              click any specialist card to set its model as the lead orchestrator
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {UPGRADED_SWARM_MODELS.map((spec) => {
              const ag = AGENTS[spec.specialist];
              const isSelected = modelId === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => setModelId(spec.id)}
                  disabled={running}
                  className={`flex flex-col justify-between border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-amber bg-amber/10"
                      : "border-line bg-panel hover:border-line2"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className="font-display text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: ag.color }}
                      >
                        {ag.name}
                      </span>
                      <span className="border border-line px-1.5 py-px font-mono text-[8.5px] text-mut">
                        {spec.ctx}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] font-semibold text-ink">{spec.label}</p>
                    <p className="mt-0.5 font-mono text-[9px] text-mut">{spec.arch}</p>
                  </div>
                  <p className="mt-2 border-t border-line/60 pt-1.5 font-mono text-[8.5px] uppercase tracking-wider text-amber/90">
                    {spec.badge}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* predefined preset cases – task + model + policy in one click */}
      <div className="border-t border-line px-4 py-3.5">
        <p className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
          <Icon name="zap" className="h-3 w-3 text-amber" />
          preset cases · task + model + gate policy bundled
          <span className="hidden text-mut/60 sm:inline">— one click arms the swarm</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {PRESETS.map((p) => {
            const armed =
              task === p.task && modelId === p.modelId && autoApprove === p.autoApprove && liveWeb === p.liveWeb;
            return (
              <button
                key={p.id}
                onClick={() => onPreset(p)}
                disabled={running}
                title={`${p.task} · ${p.modelId}`}
                className={`group border px-2.5 py-2 text-left transition-all duration-200 disabled:cursor-not-allowed ${
                  armed
                    ? "border-amber bg-amber/10 shadow-[0_0_18px_-8px_var(--amber)]"
                    : "border-line hover:-translate-y-px hover:border-line2 hover:bg-panel2"
                }`}
              >
                <p
                  className={`flex items-center justify-between gap-1 font-display text-[11px] font-bold uppercase tracking-wider ${
                    armed ? "text-amber" : "text-ink/85 group-hover:text-ink"
                  }`}
                >
                  {p.label}
                  {armed && <span className="led-on h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />}
                </p>
                <p className="mt-1 font-mono text-[8.5px] leading-snug text-mut">{p.note}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

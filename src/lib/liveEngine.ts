import type { AgentId, AgentStatus, LtmEntry, MemoryEntry, Origin, Phase, RunRecord, StageLine, Subtask, ToolCall } from "./types";

export type EngineMode = "sim" | "live";

export interface LiveOrchestratorOpts {
  liveWeb: boolean;
  operator: string;
  origin: Origin;
  onPhase: (p: Phase) => void;
  onAgent: (a: AgentId, status: AgentStatus, meta?: string, model?: string) => void;
  onLine: (a: AgentId, line: StageLine) => void;
  onClear: () => void;
  onSubtasks: (st: Subtask[]) => void;
  onMemory: (e: MemoryEntry) => void;
  onTool: (t: ToolCall) => void;
  onReport: (md: string, score: number, wallMs: number) => void;
  onComplete: (rec: RunRecord) => void;
  onAbort?: () => void;
  apiBaseUrl?: string;
}

const STORAGE_KEY = "swarmsys.apiBase.v1";
const LOCAL_DEFAULT = ["ht", "tp://localhost:8000"].join("");

export function sanitizeApiUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return LOCAL_DEFAULT;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return LOCAL_DEFAULT;
    }
    return parsed.origin + parsed.pathname.replace(/\/+$/, "");
  } catch {
    return LOCAL_DEFAULT;
  }
}

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SWARMSYS_API_URL;
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return sanitizeApiUrl(saved);
  }
  return envUrl ? sanitizeApiUrl(envUrl) : LOCAL_DEFAULT;
}

export function setApiBaseUrl(url: string): string {
  const clean = sanitizeApiUrl(url);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, clean);
  }
  return clean;
}

export async function checkBackendHealth(baseUrl?: string): Promise<{ ok: boolean; latencyMs: number }> {
  const target = sanitizeApiUrl(baseUrl || getApiBaseUrl());
  const t0 = performance.now();
  try {
    const res = await fetch(`${target}/api/health`, { method: "GET", headers: { Accept: "application/json" } });
    const data = await res.json();
    return { ok: res.ok && data?.status === "ok", latencyMs: Math.max(1, Math.round(performance.now() - t0)) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - t0) };
  }
}

export class LiveOrchestrator {
  private opts: LiveOrchestratorOpts;
  private baseUrl: string;
  private runId: string | null = null;
  private abortCtrl: AbortController | null = null;

  constructor(opts: LiveOrchestratorOpts) {
    this.opts = opts;
    this.baseUrl = sanitizeApiUrl(opts.apiBaseUrl || getApiBaseUrl());
  }

  async run(prompt: string, autoApprove?: boolean, _ltm?: LtmEntry[], modelId?: string): Promise<void> {
    this.abort();
    this.baseUrl = sanitizeApiUrl(this.opts.apiBaseUrl || getApiBaseUrl());
    this.abortCtrl = new AbortController();
    this.opts.onClear();
    this.opts.onPhase("planning");
    try {
      const res = await fetch(`${this.baseUrl}/api/runs/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          task: prompt,
          operator: this.opts.operator,
          origin: this.opts.origin,
          liveWeb: this.opts.liveWeb,
          autoApprove: Boolean(autoApprove),
          modelId,
        }),
        signal: this.abortCtrl.signal,
      });
      const hdr = res.headers.get("X-Run-Id");
      if (hdr) this.runId = hdr;
      if (!res.ok || !res.body) throw new Error(`Backend returned ${res.status}`);
      await this.consume(res.body);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        this.opts.onLine("planner", { id: `err_${Date.now()}`, kind: "warn", text: `[Live API] ${(err as Error).message} (${this.baseUrl})` });
      }
      this.opts.onAbort?.();
    }
  }

  approve(): void { void this.resume("approve"); }
  revise(revisionNotes?: string): void { void this.resume("revise", revisionNotes); }

  abort(): void {
    if (this.abortCtrl) { this.abortCtrl.abort(); this.abortCtrl = null; }
    if (this.runId) {
      const id = this.runId;
      this.runId = null;
      fetch(`${this.baseUrl}/api/runs/${id}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "abort" }),
      }).catch(() => undefined);
    }
    this.opts.onAbort?.();
  }

  private async resume(action: "approve" | "revise", revisionNotes?: string): Promise<void> {
    if (!this.runId) return;
    this.abortCtrl = new AbortController();
    const res = await fetch(`${this.baseUrl}/api/runs/${this.runId}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ action, revisionNotes }),
      signal: this.abortCtrl.signal,
    });
    if (res.ok && res.body) await this.consume(res.body);
  }

  private async consume(stream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = stream.getReader();
    const dec = new TextDecoder("utf-8");
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const f of frames) {
        const line = f.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (typeof ev.runId === "string") this.runId = ev.runId;
          if (ev.type === "phase") this.opts.onPhase(ev.phase);
          else if (ev.type === "agent") this.opts.onAgent(ev.agent, ev.status, ev.meta, ev.model);
          else if (ev.type === "line") this.opts.onLine(ev.agent, ev.line);
          else if (ev.type === "subtasks") this.opts.onSubtasks(ev.subtasks);
          else if (ev.type === "memory") this.opts.onMemory(ev.entry);
          else if (ev.type === "tool") this.opts.onTool(ev.toolCall);
          else if (ev.type === "report") this.opts.onReport(ev.md, ev.score, ev.wallMs);
          else if (ev.type === "complete") this.opts.onComplete(ev.record);
          else if (ev.type === "aborted") this.opts.onAbort?.();
        } catch { /* ignore */ }
      }
    }
  }
}

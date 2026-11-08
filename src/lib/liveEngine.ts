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

const DEFAULT_API_BASE =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SWARMSYS_API_URL ||
  "http://localhost:8000";

export class LiveOrchestrator {
  private opts: LiveOrchestratorOpts;
  private baseUrl: string;
  private runId: string | null = null;
  private abortCtrl: AbortController | null = null;

  constructor(opts: LiveOrchestratorOpts) {
    this.opts = opts;
    this.baseUrl = (opts.apiBaseUrl || DEFAULT_API_BASE).replace(/\/+$/, "");
  }

  async run(prompt: string, autoApprove?: boolean, _ltm?: LtmEntry[], modelId?: string): Promise<void> {
    this.abort();
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
        this.opts.onLine("planner", { id: `err_${Date.now()}`, kind: "warn", text: `[Live API] ${(err as Error).message}` });
      }
      this.opts.onAbort?.();
    }
  }

  approve(): void { void this.resume("approve"); }
  revise(): void { void this.resume("revise"); }

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

  private async resume(action: "approve" | "revise"): Promise<void> {
    if (!this.runId) return;
    this.abortCtrl = new AbortController();
    const res = await fetch(`${this.baseUrl}/api/runs/${this.runId}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ action }),
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

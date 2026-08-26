export type AgentId = "planner" | "research" | "coder" | "reviewer" | "reporter";

export type AgentStatus = "idle" | "thinking" | "working" | "done";

export type Phase =
  | "idle"
  | "planning"
  | "approval"
  | "execution"
  | "review"
  | "report"
  | "complete"
  | "aborted";

export type LineKind = "sys" | "info" | "data" | "code" | "good" | "warn";

export interface StageLine {
  id: string;
  kind: LineKind;
  text: string;
}

export interface Subtask {
  id: string;
  text: string;
  owner: AgentId;
  tools: string[];
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  author: AgentId;
  persisted?: boolean;
}

export interface ToolCall {
  id: string;
  agent: AgentId;
  tool: string;
  arg: string;
  result: string;
  ms: number;
  ok: boolean;
  at: number;
}

export interface AgentRuntime {
  status: AgentStatus;
  startedAt: number;
  meta: string;
}

export interface RunRecord {
  id: string;
  task: string;
  domain: string;
  score: number;
  at: number;
  wallMs: number;
  report: string;
}

export interface LtmEntry {
  key: string;
  value: string;
}

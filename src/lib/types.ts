export type AgentId =
  | "planner"
  | "research"
  | "coder"
  | "qa"
  | "reviewer"
  | "security"
  | "devops"
  | "reporter";

export type AgentStatus = "idle" | "thinking" | "working" | "done";

export type Phase =
  | "idle"
  | "planning"
  | "approval"
  | "execution"
  | "qa"
  | "review"
  | "hardening"
  | "report"
  | "complete"
  | "aborted";

export type Origin = "manual" | "schedule";

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
  origin?: Origin;
  operator?: string;
}

export interface LtmEntry {
  key: string;
  value: string;
}

export type ViewId = "console" | "architecture" | "agents" | "ship" | "diagnostics";

/* ————— advanced tier ————— */

export interface Operator {
  id: string;
  name: string;
  createdAt: number;
}

export interface Schedule {
  id: string;
  task: string;
  everyMin: number;
  nextDue: number;
  runs: number;
  enabled: boolean;
  createdAt: number;
}

export interface ToastMsg {
  id: string;
  kind: "ok" | "warn" | "info";
  title: string;
  body?: string;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
  kind: "wiki" | "github";
  meta?: string;
}

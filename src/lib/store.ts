import type { LtmEntry, Operator, RunRecord, Schedule } from "./types";

const OPS_KEY = "swarmsys.operators.v1";
const ACTIVE_KEY = "swarmsys.activeOp.v1";
const SCHED_KEY = "swarmsys.schedules.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ————— operators (multi-user workspace) ————— */

const DEFAULT_OP: Operator = { id: "op-01", name: "operator-01", createdAt: 1735689600000 };

export function loadOperators(): Operator[] {
  const list = safeParse<Operator[]>(localStorage.getItem(OPS_KEY), []);
  if (!list.length) {
    localStorage.setItem(OPS_KEY, JSON.stringify([DEFAULT_OP]));
    return [DEFAULT_OP];
  }
  return list;
}

export function loadActiveOp(): string {
  const ops = loadOperators();
  const id = localStorage.getItem(ACTIVE_KEY) ?? ops[0].id;
  return ops.some((o) => o.id === id) ? id : ops[0].id;
}

export function saveActiveOp(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function addOperator(rawName: string): { list: Operator[]; op: Operator } {
  const list = loadOperators();
  const base =
    rawName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "operator";
  let name = base;
  let n = 2;
  while (list.some((o) => o.name === name)) name = `${base}-${n++}`;
  const op: Operator = { id: `op-${Date.now().toString(36)}`, name, createdAt: Date.now() };
  const next = [...list, op];
  localStorage.setItem(OPS_KEY, JSON.stringify(next));
  return { list: next, op };
}

/* ————— run ledger — scoped per operator ————— */

const ledgerKey = (opId: string) => `swarmsys.${opId}.ledger.v1`;

export function loadLedger(opId: string): RunRecord[] {
  return safeParse<RunRecord[]>(localStorage.getItem(ledgerKey(opId)), []);
}

export function pushLedger(opId: string, rec: RunRecord): RunRecord[] {
  const next = [rec, ...loadLedger(opId)].slice(0, 10);
  localStorage.setItem(ledgerKey(opId), JSON.stringify(next));
  return next;
}

/* ————— long-term memory — scoped per operator ————— */

const ltmKey = (opId: string) => `swarmsys.${opId}.ltm.v1`;

export function loadLtm(opId: string): LtmEntry[] {
  return safeParse<LtmEntry[]>(localStorage.getItem(ltmKey(opId)), []);
}

export function touchLtm(opId: string, domainId: string, model: string, liveSources: number): LtmEntry[] {
  const entries = loadLtm(opId);
  const key = `prefs.domain.${domainId}`;
  const existing = entries.find((e) => e.key === key);
  const count = existing ? (parseInt(existing.value, 10) || 0) + 1 : 1;
  const kept = entries.filter(
    (e) => e.key !== key && e.key !== "prefs.stack" && e.key !== "prefs.liveSources" && e.key !== "prefs.lastRun",
  );
  const next: LtmEntry[] = [
    { key, value: `${count}` },
    ...kept,
    { key: "prefs.stack", value: model },
    { key: "prefs.liveSources", value: `${liveSources}` },
    { key: "prefs.lastRun", value: new Date().toISOString().slice(0, 16).replace("T", " ") },
  ];
  localStorage.setItem(ltmKey(opId), JSON.stringify(next));
  return next;
}

export function clearLtm(opId: string): LtmEntry[] {
  localStorage.removeItem(ltmKey(opId));
  return [];
}

export function ltmCountFor(entries: LtmEntry[], domainId: string): number {
  const e = entries.find((x) => x.key === `prefs.domain.${domainId}`);
  return e ? parseInt(e.value, 10) || 0 : 0;
}

/* ————— autonomous scheduler ————— */

export function loadSchedules(): Schedule[] {
  return safeParse<Schedule[]>(localStorage.getItem(SCHED_KEY), []);
}

export function saveSchedules(list: Schedule[]) {
  localStorage.setItem(SCHED_KEY, JSON.stringify(list));
}

/* ————— misc ————— */

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

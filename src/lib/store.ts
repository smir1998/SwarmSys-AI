import type { LtmEntry, RunRecord } from "./types";

const LEDGER_KEY = "swarmsmith.ledger.v1";
const LTM_KEY = "swarmsmith.ltm.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ————— run ledger (history) ————— */
export function loadLedger(): RunRecord[] {
  return safeParse<RunRecord[]>(localStorage.getItem(LEDGER_KEY), []);
}

export function pushLedger(rec: RunRecord): RunRecord[] {
  const next = [rec, ...loadLedger()].slice(0, 8);
  localStorage.setItem(LEDGER_KEY, JSON.stringify(next));
  return next;
}

/* ————— long-term memory (user preferences) ————— */
export function loadLtm(): LtmEntry[] {
  return safeParse<LtmEntry[]>(localStorage.getItem(LTM_KEY), []);
}

export function touchLtm(domainId: string, domainLabel: string, model: string): LtmEntry[] {
  const entries = loadLtm();
  const key = `prefs.domain.${domainId}`;
  const existing = entries.find((e) => e.key === key);
  const count = existing ? (parseInt(existing.value, 10) || 0) + 1 : 1;
  const withoutOld = entries.filter((e) => e.key !== key && e.key !== "prefs.stack");
  const next: LtmEntry[] = [
    { key, value: `${count}× built` },
    ...withoutOld,
    { key: "prefs.stack", value: model },
  ];
  localStorage.setItem(LTM_KEY, JSON.stringify(next));
  return next;
}

export function ltmCountFor(entries: LtmEntry[], domainId: string): number {
  const e = entries.find((x) => x.key === `prefs.domain.${domainId}`);
  return e ? parseInt(e.value, 10) || 0 : 0;
}

export function clearLtm(): LtmEntry[] {
  localStorage.removeItem(LTM_KEY);
  return [];
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

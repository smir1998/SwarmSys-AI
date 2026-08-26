import { useState } from "react";
import { AGENTS } from "../lib/knowledge";
import { timeAgo } from "../lib/store";
import type { LtmEntry, MemoryEntry, RunRecord, ToolCall } from "../lib/types";

type Tab = "memory" | "tools" | "ledger";

export default function MemoryPanel({
  memory,
  tools,
  ledger,
  ltm,
  onRehydrate,
  onPurgeLtm,
}: {
  memory: MemoryEntry[];
  tools: ToolCall[];
  ledger: RunRecord[];
  ltm: LtmEntry[];
  onRehydrate: (rec: RunRecord) => void;
  onPurgeLtm: () => void;
}) {
  const [tab, setTab] = useState<Tab>("memory");

  return (
    <aside className="flex flex-col border border-line bg-panel" aria-label="Shared memory and tools">
      <div className="flex border-b border-line">
        {(["memory", "tools", "ledger"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 border-b-2 px-2 py-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-all ${
              tab === t ? "border-amber text-amber" : "border-transparent text-mut hover:text-ink"
            }`}
          >
            {t}
            <span className="ml-1.5 opacity-60">
              {t === "memory" ? memory.length + ltm.length : t === "tools" ? tools.length : ledger.length}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-[380px] flex-1 overflow-y-auto p-3.5" style={{ maxHeight: 560 }}>
        {tab === "memory" && (
          <div className="space-y-2">
            <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.18em] text-mut">
              short-term — written &amp; read by agents during this run
            </p>
            {ltm.length > 0 && (
              <div className="space-y-1.5 border border-amber/25 bg-amber/5 p-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-amber">
                  long-term · persisted to this browser
                </p>
                {ltm.map((e) => (
                  <p key={e.key} className="font-mono text-[10.5px] leading-relaxed text-ink/80">
                    <span className="text-amber">{e.key}</span>
                    <span className="text-mut"> = </span>
                    {e.value}
                  </p>
                ))}
              </div>
            )}
            {memory.length === 0 ? (
              <p className="py-6 text-center font-mono text-[10.5px] text-mut/60">
                no entries yet — memory fills as agents work
              </p>
            ) : (
              memory.map((m) => (
                <div key={m.id} className="sline border border-line bg-bg px-2.5 py-2">
                  <p className="font-mono text-[10.5px] leading-relaxed break-all">
                    <span style={{ color: AGENTS[m.author].color }}>{m.key}</span>
                    <span className="text-mut"> = </span>
                    <span className="text-ink/85">{m.value}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-mut">
                    <span className="h-1 w-1 rounded-full" style={{ background: AGENTS[m.author].color }} />
                    written by {AGENTS[m.author].name}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "tools" && (
          <div className="space-y-2">
            <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.18em] text-mut">
              external tool invocations · 7 tools registered
            </p>
            {tools.length === 0 ? (
              <p className="py-6 text-center font-mono text-[10.5px] text-mut/60">
                no calls yet — agents invoke tools mid-run
              </p>
            ) : (
              tools.map((t) => (
                <div key={t.id} className="sline border border-line bg-bg px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10.5px]">
                      <span className="text-amber">{t.tool}</span>
                      <span className="text-mut">({t.arg.length > 30 ? t.arg.slice(0, 30) + "…" : t.arg})</span>
                    </p>
                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-mut">{t.ms}ms</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-ink/75">
                    <span className={`h-1.5 w-1.5 rounded-full ${t.ok ? "bg-coder" : "bg-coral"}`} />
                    {t.result}
                  </p>
                  <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-mut">
                    via {AGENTS[t.agent].name}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "ledger" && (
          <div className="space-y-2">
            <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.18em] text-mut">
              run history · persisted · click to rehydrate a report
            </p>
            {ledger.length === 0 ? (
              <p className="py-6 text-center font-mono text-[10.5px] text-mut/60">
                no runs yet — completed runs land here and survive reloads
              </p>
            ) : (
              ledger.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onRehydrate(r)}
                  className="sline block w-full border border-line bg-bg px-2.5 py-2.5 text-left transition-all hover:border-amber/60 hover:bg-panel2"
                >
                  <p className="truncate font-mono text-[10.5px] text-ink/85">{r.task}</p>
                  <p className="mt-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-mut">
                    <span>{r.domain}</span>
                    <span>
                      <span className={r.score >= 90 ? "text-coder" : "text-amber"}>{r.score}/100</span>
                      {" · " + timeAgo(r.at)}
                    </span>
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-mut">
          {memory.length} run · {ltm.length} ltm entries
        </span>
        {ltm.length > 0 && (
          <button
            onClick={onPurgeLtm}
            className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-mut transition-all hover:border-coral hover:text-coral"
          >
            purge ltm
          </button>
        )}
      </div>
    </aside>
  );
}

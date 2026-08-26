import { useCallback, useRef, useState } from "react";
import { runSuite, TEST_CASES } from "../lib/diagnostics";
import type { CaseResult, CaseStatus, SuiteMode } from "../lib/diagnostics";
import { Icon, Reveal, SectionHead } from "../lib/ui";

const GROUP_COLOR: Record<string, string> = {
  detection: "var(--c-planner)",
  sql: "var(--c-research)",
  memory: "var(--c-reporter)",
  engine: "var(--c-coder)",
  resilience: "var(--amber)",
};

export default function DiagnosticsSection() {
  const [statuses, setStatuses] = useState<Record<string, CaseStatus>>({});
  const [results, setResults] = useState<Record<string, CaseResult>>({});
  const [running, setRunning] = useState<SuiteMode | null>(null);
  const [lastStamp, setLastStamp] = useState<string | null>(null);
  const stopRef = useRef(false);

  const setCase = useCallback((id: string, status: CaseStatus, result?: CaseResult) => {
    setStatuses((p) => ({ ...p, [id]: status }));
    if (result) setResults((p) => ({ ...p, [id]: result }));
  }, []);

  const start = useCallback(
    async (mode: SuiteMode) => {
      stopRef.current = false;
      setRunning(mode);
      setResults({});
      setStatuses({});
      await runSuite(mode, (u) => setCase(u.id, u.status, u.result), () => stopRef.current);
      setRunning(null);
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setLastStamp(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    },
    [setCase],
  );

  const settled = TEST_CASES.filter((c) => statuses[c.id] === "pass" || statuses[c.id] === "fail");
  const passed = settled.filter((c) => statuses[c.id] === "pass").length;
  const totalMs = settled.reduce((s, c) => s + (results[c.id]?.ms ?? 0), 0);
  const allGreen = settled.length > 0 && passed === settled.length;

  return (
    <section id="diagnostics" className="relative mx-auto max-w-[1560px] px-5 pb-20 pt-[7.5rem] md:px-8 md:pb-28 md:pt-[8rem]">
      <SectionHead
        no="04"
        title="Diagnostics"
        desc="Predefined cases executed against the live system — domain routing, the SQL engine, memory stores, the full 8-agent pipeline, the abort path and endpoint resilience. No mocks: the real modules run."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* ————— controls + case matrix ————— */}
        <Reveal>
          <div className="space-y-5">
            <div className="border border-line bg-panel">
              <p className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-mut">
                <Icon name="zap" className="h-3.5 w-3.5 text-amber" />
                suite controls
              </p>
              <div className="space-y-3 p-4">
                <div className="flex gap-2.5">
                  <button
                    onClick={() => start("unit")}
                    disabled={!!running}
                    className="flex h-11 flex-1 items-center justify-center gap-2 bg-amber font-display text-xs font-bold uppercase tracking-[0.1em] text-[#0a0f12] transition-all hover:bg-ink disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Icon name="play" className="h-3.5 w-3.5" />
                    Unit · 9 cases
                  </button>
                  <button
                    onClick={() => start("full")}
                    disabled={!!running}
                    className="flex h-11 flex-1 items-center justify-center gap-2 border-2 border-amber font-display text-xs font-bold uppercase tracking-[0.1em] text-amber transition-all hover:bg-amber hover:text-[#0a0f12] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Icon name="play" className="h-3.5 w-3.5" />
                    Full · 12
                  </button>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => (stopRef.current = true)}
                    disabled={!running}
                    className="flex h-10 flex-1 items-center justify-center gap-2 border border-coral/60 font-mono text-[10px] uppercase tracking-[0.16em] text-coral transition-all hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Icon name="stop" className="h-3 w-3" />
                    Stop
                  </button>
                  <button
                    onClick={() => {
                      setStatuses({});
                      setResults({});
                      setLastStamp(null);
                    }}
                    disabled={!!running || settled.length === 0}
                    className="flex h-10 flex-1 items-center justify-center gap-2 border border-line font-mono text-[10px] uppercase tracking-[0.16em] text-mut transition-all hover:border-line2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Icon name="refresh" className="h-3 w-3" />
                    Clear
                  </button>
                </div>

                {/* live tally */}
                <div className="border border-line bg-bg px-3.5 py-3">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
                    <span>
                      {running ? (
                        <span className="text-amber">
                          executing {running} suite
                          <span className="blink ml-1 inline-block h-2.5 w-1.5 translate-y-[1px] bg-amber" />
                        </span>
                      ) : lastStamp ? (
                        `last run ${lastStamp}`
                      ) : (
                        "no suite executed yet"
                      )}
                    </span>
                    <span className={allGreen ? "text-coder" : settled.some((c) => statuses[c.id] === "fail") ? "text-coral" : "text-mut"}>
                      {passed}/{settled.length} passed
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-line">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${settled.length ? (passed / settled.length) * 100 : 0}%`,
                        background: allGreen ? "var(--c-coder)" : "var(--coral)",
                      }}
                    />
                  </div>
                  {settled.length > 0 && (
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-mut">
                      {settled.length} cases · {(totalMs / 1000).toFixed(1)}s cumulative
                    </p>
                  )}
                </div>
                <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-mut/70">
                  full suite drives two real swarm runs + an abort — expect ~40s
                </p>
              </div>
            </div>

            {/* predefined case matrix */}
            <div className="border border-line bg-panel">
              <p className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-mut">
                <Icon name="terminal" className="h-3.5 w-3.5 text-research" />
                predefined case matrix
              </p>
              <div className="max-h-[430px] overflow-y-auto">
                {TEST_CASES.map((c) => (
                  <div key={c.id} className="border-b border-line px-4 py-2.5 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[10.5px] text-ink/85">
                        <span style={{ color: GROUP_COLOR[c.group] }}>{c.id}</span>
                        <span className="text-mut"> · </span>
                        {c.title}
                      </p>
                      {c.heavy && (
                        <span className="shrink-0 border border-line px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.12em] text-mut">
                          e2e
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[9.5px] text-mut">
                      <span className="text-research">in</span> {c.input}
                    </p>
                    <p className="font-mono text-[9.5px] text-mut">
                      <span className="text-coder">exp</span> {c.expects}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ————— live execution results ————— */}
        <Reveal delay={120}>
          <div className="border border-line bg-panel">
            <p className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-mut">
                <Icon name="nodes" className="h-3.5 w-3.5 text-coder" />
                execution log
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-mut/70">
                verdicts stream in as each case lands
              </span>
            </p>
            <div className="min-h-[520px] p-4">
              {settled.length === 0 && !running ? (
                <div className="flex h-[480px] flex-col items-center justify-center gap-5 text-center">
                  <p className="stroke-dim font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                    Run the suite
                  </p>
                  <p className="max-w-md font-mono text-[11px] leading-relaxed text-mut">
                    Unit suite verifies routing, SQL, and memory in under a second. The full suite
                    additionally executes two real swarm runs end-to-end and replays the abort
                    regression that once stranded the console.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {TEST_CASES.filter((c) => statuses[c.id]).map((c) => {
                    const st = statuses[c.id];
                    const r = results[c.id];
                    const color =
                      st === "pass" ? "var(--c-coder)" : st === "fail" ? "var(--coral)" : "var(--amber)";
                    return (
                      <div
                        key={c.id}
                        className={`sline border px-3.5 py-3 transition-colors ${
                          st === "fail" ? "border-coral/50 bg-coral/5" : "border-line bg-bg"
                        }`}
                        style={{ borderLeft: `3px solid ${color}` }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${st === "running" ? "led-fast" : ""}`}
                            style={{ background: color }}
                          />
                          <span className="font-mono text-[10px]" style={{ color: GROUP_COLOR[c.group] }}>
                            {c.id}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink/85">{c.title}</span>
                          <span
                            className="shrink-0 font-display text-[11px] font-bold uppercase tracking-[0.14em]"
                            style={{ color }}
                          >
                            {st === "running" ? "running" : st}
                          </span>
                        </div>
                        {st === "running" ? (
                          <p className="mt-1.5 pl-5 font-mono text-[10px] text-mut">
                            {c.heavy ? "swarm executing — agents streaming…" : "executing…"}
                          </p>
                        ) : r ? (
                          <p className="mt-1.5 break-words pl-5 font-mono text-[10.5px] leading-relaxed text-mut">
                            <span style={{ color }} className="mr-1.5">
                              {st === "pass" ? "✓" : "✗"}
                            </span>
                            {r.detail}
                            <span className="ml-2 text-mut/60">· {r.ms >= 1000 ? `${(r.ms / 1000).toFixed(1)}s` : `${r.ms}ms`}</span>
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

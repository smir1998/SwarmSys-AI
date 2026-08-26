import { ReactNode, useEffect, useRef } from "react";
import { AGENTS } from "../lib/knowledge";
import type { AgentId, AgentRuntime, Phase, StageLine, Subtask } from "../lib/types";
import { Icon, MarkdownLite } from "../lib/ui";

/* ————— one streamed line ————— */
const KIND_STYLE: Record<StageLine["kind"], { mark: string; cls: string }> = {
  sys: { mark: "›", cls: "text-mut" },
  info: { mark: "·", cls: "text-ink/85" },
  data: { mark: "▪", cls: "text-research" },
  code: { mark: "", cls: "" },
  good: { mark: "✓", cls: "text-coder" },
  warn: { mark: "!", cls: "text-coral" },
};

function LineRow({ line }: { line: StageLine }) {
  if (line.kind === "code") {
    return (
      <div className="sline ml-1 border-l border-coder/25 pl-3 font-mono text-[11.5px] leading-[1.55] text-coder/90">
        <span className="whitespace-pre">{line.text || " "}</span>
      </div>
    );
  }
  const s = KIND_STYLE[line.kind];
  return (
    <div className={`sline flex gap-2 font-mono text-[11.5px] leading-[1.55] ${s.cls}`}>
      <span className="w-3 shrink-0 select-none text-center opacity-70">{s.mark}</span>
      <span className="min-w-0">{line.text}</span>
    </div>
  );
}

/* ————— a stage card with auto-scrolling stream ————— */
function StageCard({
  agent,
  lines,
  rt,
  maxH = 230,
  children,
}: {
  agent: AgentId;
  lines: StageLine[];
  rt: AgentRuntime;
  maxH?: number;
  children?: ReactNode;
}) {
  const def = AGENTS[agent];
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);
  const active = rt.status === "thinking" || rt.status === "working";
  return (
    <div
      className="border border-line bg-panel transition-all duration-300"
      style={{ boxShadow: active ? `0 0 28px -10px ${def.color}` : undefined }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <p className="flex items-center gap-2.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${active ? "led-fast" : ""}`}
            style={{ background: rt.status === "idle" ? "var(--line2)" : def.color }}
          />
          <span className="font-display text-xs font-bold uppercase tracking-[0.12em]" style={{ color: def.color }}>
            {def.name}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-mut">
            {rt.status === "idle" ? "queued" : rt.status === "done" ? "done" : rt.status}
          </span>
        </p>
        <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-mut">{rt.meta}</span>
      </div>
      <div ref={bodyRef} className="overflow-auto px-4 py-3" style={{ maxHeight: maxH, minHeight: 76 }}>
        {lines.length === 0 && !active ? (
          <p className="font-mono text-[11px] text-mut/50">— idle, waiting on upstream —</p>
        ) : (
          <div className="space-y-1">
            {lines.map((l) => (
              <LineRow key={l.id} line={l} />
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ————— connector between stages ————— */
function Connector({ label }: { label?: string }) {
  return (
    <div className="relative flex h-9 items-center justify-center">
      <span className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-line2 to-line md:left-1/2" />
      {label && (
        <span className="relative z-10 bg-bg px-2.5 font-mono text-[9px] uppercase tracking-[0.22em] text-mut">
          {label}
        </span>
      )}
    </div>
  );
}

/* ————— the full pipeline ————— */
export default function Pipeline({
  stages,
  agents,
  subtasks,
  phase,
  report,
  score,
  wallMs,
  ledgerNote,
  onApprove,
  onRevise,
  onCopy,
  onDownload,
  onPdf,
  onNewRun,
  copied,
}: {
  stages: Record<AgentId, StageLine[]>;
  agents: Record<AgentId, AgentRuntime>;
  subtasks: Subtask[];
  phase: Phase;
  report: string;
  score: number | null;
  wallMs: number | null;
  ledgerNote: string | null;
  onApprove: () => void;
  onRevise: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onPdf: () => void;
  onNewRun: () => void;
  copied: boolean;
}) {
  const empty =
    phase === "idle" &&
    Object.values(stages).every((l) => l.length === 0) &&
    !report;

  if (empty) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 border-2 border-dashed border-line px-6 py-16 text-center">
        <div className="flex items-center gap-3">
          {(["planner", "research", "coder", "reviewer", "reporter"] as AgentId[]).map((a, i) => (
            <span key={a} className="drift" style={{ animationDelay: `${i * 0.5}s` }}>
              <span className="block h-2.5 w-2.5 rounded-full" style={{ background: AGENTS[a].color, opacity: 0.75 }} />
            </span>
          ))}
        </div>
        <p className="stroke-dim font-display text-3xl font-bold uppercase tracking-tight sm:text-5xl">
          Awaiting task
        </p>
        <p className="max-w-md font-mono text-xs leading-relaxed text-mut">
          Feed the swarm a goal above. The planner decomposes it, research and coder execute in
          parallel, QA runs the test matrix, the reviewer gates quality, security and devops harden
          the ship — and the reporter assembles the final response.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mut/60">
          plan → approve → exec ∥ → qa → review ↺ → harden ∥ → report
        </p>
      </div>
    );
  }

  const scoreColor = score === null ? "var(--mut)" : score >= 90 ? "var(--c-coder)" : score >= 85 ? "var(--amber)" : "var(--coral)";

  return (
    <div>
      {/* planner */}
      <StageCard agent="planner" lines={stages.planner} rt={agents.planner} maxH={250}>
        {subtasks.length > 0 && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mut">approved subtask graph</p>
            <div className="space-y-1.5">
              {subtasks.map((st, i) => (
                <div key={st.id} className="flex items-center gap-2.5 font-mono text-[10.5px]">
                  <span className="text-mut">{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: AGENTS[st.owner].color }} />
                  <span className="min-w-0 flex-1 truncate text-ink/80">{st.text}</span>
                  <span className="hidden gap-1 sm:flex">
                    {st.tools.slice(0, 2).map((t) => (
                      <span key={t} className="border border-line px-1 py-px text-[8.5px] text-mut">
                        {t}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </StageCard>

      {/* human approval gate */}
      {phase === "approval" && (
        <div className="gate-pulse my-4 flex flex-col items-center justify-between gap-4 border-2 border-amber bg-amber/5 px-5 py-4 sm:flex-row">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.1em] text-amber">
              Human approval required
            </p>
            <p className="mt-1 font-mono text-[10.5px] text-mut">
              plan ready · {subtasks.length} subtasks · execution is paused on your call — this is the
              critical-action gate
            </p>
          </div>
          <div className="flex w-full shrink-0 gap-2.5 sm:w-auto">
            <button
              onClick={onRevise}
              className="flex flex-1 touch-manipulation items-center justify-center gap-2 border border-amber/50 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-amber transition-all hover:bg-amber/10 sm:flex-none"
            >
              <Icon name="refresh" className="h-3.5 w-3.5" />
              Revise scope
            </button>
            <button
              onClick={onApprove}
              className="flex flex-1 touch-manipulation items-center justify-center gap-2 bg-amber px-5 py-2.5 font-display text-xs font-bold uppercase tracking-[0.1em] text-[#0a0f12] transition-all hover:bg-ink hover:text-bg sm:flex-none"
            >
              <Icon name="check" className="h-3.5 w-3.5" />
              Approve & run
            </button>
          </div>
        </div>
      )}

      <Connector label={phase === "approval" ? "gated" : "fan-out"} />

      {/* parallel execution */}
      <div className="grid gap-3 md:grid-cols-2">
        <StageCard agent="research" lines={stages.research} rt={agents.research} maxH={300} />
        <StageCard agent="coder" lines={stages.coder} rt={agents.coder} maxH={300} />
      </div>

      <Connector label="fan-in · test gate" />
      <StageCard agent="qa" lines={stages.qa} rt={agents.qa} maxH={230} />
      <Connector label="matrix green" />
      <StageCard agent="reviewer" lines={stages.reviewer} rt={agents.reviewer} maxH={250} />
      <Connector label="cleared · hardening fan-out" />
      <div className="grid gap-3 md:grid-cols-2">
        <StageCard agent="security" lines={stages.security} rt={agents.security} maxH={230} />
        <StageCard agent="devops" lines={stages.devops} rt={agents.devops} maxH={230} />
      </div>
      <Connector label="contracts sealed" />
      <StageCard agent="reporter" lines={stages.reporter} rt={agents.reporter} maxH={190} />

      {/* final response */}
      {report && (
        <div className="popin mt-6 border-2 border-line2 bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <p className="flex items-center gap-3">
              <Icon name="zap" className="h-4 w-4 text-amber" />
              <span className="font-display text-sm font-bold uppercase tracking-[0.12em]">Final response</span>
              {ledgerNote && (
                <span className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-mut">
                  {ledgerNote}
                </span>
              )}
            </p>
            <div className="flex items-center gap-4">
              {score !== null && (
                <p className="font-mono text-[11px] uppercase tracking-[0.12em]">
                  quality <span className="text-base font-semibold tabular-nums" style={{ color: scoreColor }}>{score}</span>
                  <span className="text-mut">/100</span>
                </p>
              )}
              {wallMs !== null && (
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mut">
                  wall <span className="text-ink tabular-nums">{(wallMs / 1000).toFixed(1)}s</span>
                </p>
              )}
            </div>
          </div>
          <div className="max-h-[480px] overflow-y-auto px-5 py-4 md:px-7">
            <MarkdownLite md={report} />
          </div>
          <div className="flex flex-wrap items-center gap-2.5 border-t border-line px-5 py-3.5">
            <button
              onClick={onCopy}
              className="flex items-center gap-2 border border-line px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mut transition-all hover:border-amber hover:text-amber"
            >
              <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy markdown"}
            </button>
            <button
              onClick={onDownload}
              className="flex items-center gap-2 border border-line px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mut transition-all hover:border-amber hover:text-amber"
            >
              <Icon name="download" className="h-3.5 w-3.5" />
              Download .md
            </button>
            <button
              onClick={onPdf}
              className="flex items-center gap-2 border border-reporter/50 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-reporter transition-all hover:bg-reporter/10"
              title="Render the report as a typeset PDF"
            >
              <Icon name="download" className="h-3.5 w-3.5" />
              Export PDF
            </button>
            <button
              onClick={onNewRun}
              className="ml-auto flex items-center gap-2 border border-coder/50 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-coder transition-all hover:bg-coder/10"
            >
              <Icon name="refresh" className="h-3.5 w-3.5" />
              New run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

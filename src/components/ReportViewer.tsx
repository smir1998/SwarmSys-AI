import { useEffect, useState } from "react";
import { Icon } from "../lib/ui";

export interface ViewerState {
  kind: "pdf" | "md";
  url: string | null; // blob URL for pdf
  md?: string; // raw markdown for md
  name: string;
}

/* hardened save — anchor attached to the DOM, URL revoked after a beat,
   so it survives contexts where detached-anchor clicks are swallowed */
function saveFromUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => a.remove(), 1500);
}

export default function ReportViewer({ state, onClose }: { state: ViewerState; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveMd = () => {
    if (!state.md) return;
    const blob = new Blob([state.md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    saveFromUrl(url, state.name);
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(state.md ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm md:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Report viewer — ${state.name}`}
    >
      <div
        className="popin flex h-[86vh] w-[min(980px,100%)] flex-col border-2 border-line2 bg-panel shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <p className="flex min-w-0 items-center gap-3">
            <Icon name="download" className="h-4 w-4 shrink-0 text-amber" />
            <span className="truncate font-display text-sm font-bold uppercase tracking-[0.1em]">{state.name}</span>
            <span className="shrink-0 border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-mut">
              {state.kind === "pdf" ? "typeset pdf" : "markdown"}
            </span>
          </p>
          <div className="flex items-center gap-2">
            {state.kind === "pdf" && state.url && (
              <>
                <button
                  onClick={() => state.url && saveFromUrl(state.url, state.name)}
                  className="flex items-center gap-2 bg-amber px-3.5 py-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#0a0f12] transition-all hover:bg-ink"
                >
                  <Icon name="download" className="h-3.5 w-3.5" />
                  Save file
                </button>
                <button
                  onClick={() => state.url && window.open(state.url, "_blank", "noopener")}
                  className="flex items-center gap-2 border border-line px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mut transition-all hover:border-amber hover:text-amber"
                >
                  <Icon name="up" className="h-3.5 w-3.5" />
                  New tab
                </button>
              </>
            )}
            {state.kind === "md" && (
              <>
                <button
                  onClick={copyMd}
                  className={`flex items-center gap-2 border px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-all ${
                    copied ? "border-coder text-coder" : "border-line text-mut hover:border-amber hover:text-amber"
                  }`}
                >
                  <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={saveMd}
                  className="flex items-center gap-2 bg-amber px-3.5 py-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#0a0f12] transition-all hover:bg-ink"
                >
                  <Icon name="download" className="h-3.5 w-3.5" />
                  Save file
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="flex items-center gap-2 border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mut transition-all hover:border-coral hover:text-coral"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
              Close
            </button>
          </div>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 bg-bg">
          {state.kind === "pdf" && state.url ? (
            <iframe src={state.url} title={state.name} className="h-full w-full border-0" />
          ) : (
            <pre className="h-full w-full overflow-auto whitespace-pre-wrap px-6 py-5 font-mono text-[11.5px] leading-relaxed text-ink/85">
              {state.md}
            </pre>
          )}
        </div>

        {/* footer hint */}
        <p className="border-t border-line px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mut/70">
          {state.kind === "pdf"
            ? "if “save file” is blocked by your browser, use “new tab” → save from there"
            : "esc closes · copy works everywhere · save file triggers your browser download"}
        </p>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import type { ToastMsg } from "../lib/types";
import { Icon } from "../lib/ui";

function ToastCard({ t, onDismiss }: { t: ToastMsg; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const id = window.setTimeout(() => onDismiss(t.id), 5600);
    return () => window.clearTimeout(id);
  }, [t.id, onDismiss]);
  const color = t.kind === "ok" ? "var(--c-coder)" : t.kind === "warn" ? "var(--coral)" : "var(--c-research)";
  return (
    <div
      className="popin pointer-events-auto border border-line bg-panel2 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.85)]"
      style={{ borderLeft: `3px solid ${color}` }}
      role="status"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.kind === "ok" ? "" : "led-on"}`} style={{ background: color }} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[12px] font-bold uppercase tracking-[0.08em]">{t.title}</p>
          {t.body && <p className="mt-0.5 break-words font-mono text-[10.5px] leading-snug text-mut">{t.body}</p>}
        </div>
        <button onClick={() => onDismiss(t.id)} className="mt-0.5 text-mut transition-colors hover:text-ink" aria-label="Dismiss notification">
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function NotifyToasts({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="pointer-events-none fixed right-5 z-[90] flex w-[min(370px,92vw)] flex-col gap-2.5"
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} t={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/* optional browser push — only when the operator arms it */
export function browserNotify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    /* ignore */
  }
}

export async function askNotifyPermission(): Promise<boolean> {
  try {
    if (!("Notification" in window)) return false;
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

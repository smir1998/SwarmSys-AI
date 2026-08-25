import { useEffect, useState } from "react";
import { FONTS, FoundryFont, fmtEUR } from "../lib/data";
import { Icon } from "../lib/ui";

export default function CartDrawer({
  open,
  onClose,
  cart,
  onRemove,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  cart: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [sent, setSent] = useState<string | null>(null);
  const items: FoundryFont[] = cart.map((id) => FONTS.find((f) => f.id === id)).filter(Boolean) as FoundryFont[];
  const total = items.reduce((s, f) => s + f.price, 0);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  useEffect(() => {
    if (open && sent && items.length === 0) setSent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const checkout = () => {
    const no = `OFZ-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    setSent(no);
    onClear();
  };

  return (
    <div className={`fixed inset-0 z-[80] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-[#17150e]/50 transition-opacity duration-400 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="License cart"
        className={`absolute right-0 top-0 flex h-full w-[min(430px,94vw)] flex-col border-l-2 border-ink bg-bg transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-ink px-6 py-5">
          <p className="font-grotesk text-xl font-black uppercase tracking-tight">
            License cart <span className="text-acc">({items.length})</span>
          </p>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center border border-line transition-all hover:rotate-90 hover:border-acc hover:text-acc"
            aria-label="Close cart"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center border-2 border-acc text-acc [animation:pop_0.5s_ease]">
              <Icon name="check" className="h-7 w-7" />
            </span>
            <p className="font-grotesk text-2xl font-black uppercase tracking-tight">Request received</p>
            <p className="font-mono text-xs leading-relaxed text-mut">
              Order <span className="text-ink">{sent}</span> — license agreements and invoice are
              on their way to your inbox. Fonts ship within the hour.
            </p>
            <button
              onClick={() => {
                setSent(null);
                onClose();
              }}
              className="mt-2 bg-ink px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bg transition-colors hover:bg-acc hover:text-accink"
            >
              Back to the press
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="font-antiqua text-7xl italic text-mut/50">Æ</span>
            <p className="font-grotesk text-lg font-bold uppercase tracking-tight">Nothing set yet</p>
            <p className="max-w-[28ch] font-mono text-xs leading-relaxed text-mut">
              Pick a family from the catalog — the press does the rest.
            </p>
            <a
              href="#catalog"
              onClick={onClose}
              className="mt-2 flex items-center gap-2 border-b-2 border-acc pb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-acc"
            >
              To the catalog <Icon name="arrow" className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto">
              {items.map((f) => (
                <li key={f.id} className="group flex items-center gap-4 border-b border-line px-6 py-5 transition-colors hover:bg-card">
                  <span className={`text-3xl font-bold ${f.css}`} style={{ fontWeight: Math.min(f.weights[1], 700) }}>
                    {f.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-lg font-bold leading-tight ${f.css}`}>{f.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mut">
                      {f.styles} styles · desktop + web + app
                    </p>
                  </div>
                  <span className="font-grotesk text-lg font-black tabular-nums">{fmtEUR(f.price)}</span>
                  <button
                    onClick={() => onRemove(f.id)}
                    className="flex h-8 w-8 items-center justify-center border border-line text-mut transition-all hover:border-acc hover:text-acc"
                    aria-label={`Remove ${f.name}`}
                  >
                    <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t-2 border-ink px-6 py-6">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-mut">Subtotal</span>
                <span className="font-grotesk text-3xl font-black tabular-nums">{fmtEUR(total)}</span>
              </div>
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-mut">
                Excl. VAT · multi-seat, server &amp; broadcast licenses on request.
              </p>
              <button
                onClick={checkout}
                className="group mt-5 flex w-full items-center justify-center gap-3 bg-acc py-4 font-mono text-xs uppercase tracking-[0.2em] text-accink transition-all duration-300 hover:bg-ink hover:text-bg"
              >
                Request license agreement
                <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

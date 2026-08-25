import { useEffect, useState } from "react";
import { Icon } from "../lib/ui";

const LINKS = [
  { href: "#tester", no: "01", label: "Tester" },
  { href: "#catalog", no: "02", label: "Catalog" },
  { href: "#glyphs", no: "03", label: "Glyphs" },
  { href: "#inuse", no: "04", label: "In Use" },
];

export default function Nav({
  theme,
  onTheme,
  cartCount,
  onCart,
}: {
  theme: "paper" | "ink";
  onTheme: () => void;
  cartCount: number;
  onCart: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-line bg-bg/90 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 md:h-[72px] md:px-10">
        <a href="#top" className="group flex items-baseline gap-2.5">
          <span className="inline-block h-4 w-4 translate-y-[-1px] bg-acc transition-transform duration-300 group-hover:rotate-90" />
          <span className="font-grotesk text-xl font-black uppercase tracking-tight">
            Offizin<span className="align-super text-[10px] font-bold text-mut">®</span>
          </span>
          <span className="hidden font-mono text-[10px] tracking-[0.18em] text-mut sm:inline">
            TYPE FOUNDRY — BERLIN
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="link-rule font-mono text-[11px] uppercase tracking-[0.18em] text-mut transition-colors hover:text-ink"
            >
              <span className="mr-1.5 text-acc">{l.no}</span>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onTheme}
            className="flex h-10 items-center gap-2 border border-line px-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-mut transition-all hover:border-ink hover:text-ink"
            aria-label="Toggle ink / paper theme"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full transition-colors ${
                theme === "ink" ? "bg-acc2" : "bg-ink"
              }`}
            />
            {theme === "ink" ? "Ink" : "Paper"}
          </button>
          <button
            onClick={onCart}
            className="relative flex h-10 items-center gap-2 border border-line px-3.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all hover:border-acc hover:bg-acc hover:text-accink"
            aria-label={`Open license cart, ${cartCount} items`}
          >
            <Icon name="bag" className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center bg-acc px-1 font-mono text-[10px] font-bold text-accink [animation:pop_0.4s_ease]"
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* compact link row on small screens */}
      <nav
        aria-label="Primary mobile"
        className="mx-auto flex max-w-[1400px] items-center gap-5 overflow-x-auto px-5 pb-2.5 lg:hidden"
      >
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-mut transition-colors hover:text-ink"
          >
            <span className="mr-1 text-acc">{l.no}</span>
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

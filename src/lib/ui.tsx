import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";

/* ————— prefers-reduced-motion ————— */
export function usePRM(): boolean {
  const [prm, setPrm] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = (e: MediaQueryListEvent) => setPrm(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return prm;
}

/* ————— ticking clock ————— */
export function useNow(active: boolean, interval = 500): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [active, interval]);
  return now;
}

/* ————— scroll reveal ————— */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

/* ————— section header ————— */
export function SectionHead({ no, title, desc }: { no: string; title: string; desc?: string }) {
  return (
    <div className="border-t-2 border-line2 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <p className="font-mono text-xs tracking-[0.28em] text-amber">/{no}</p>
          <h2 className="mt-2 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h2>
        </div>
        {desc && <p className="max-w-sm pb-1 font-mono text-xs leading-relaxed text-mut">{desc}</p>}
      </div>
    </div>
  );
}

/* ————— inline SVG icon set ————— */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "square" as const };

export function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  switch (name) {
    case "play":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M7 4.5v15l12-7.5L7 4.5Z" />
        </svg>
      );
    case "stop":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <rect x="6" y="6" width="12" height="12" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M4.5 12.5l5 5L19.5 7" />
        </svg>
      );
    case "close":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "copy":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <rect x="8" y="8" width="11" height="11" />
          <path d="M5 15V5h10" />
        </svg>
      );
    case "download":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M12 4v11M6.5 10.5L12 16l5.5-5.5M4 20h16" />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      );
    case "up":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M12 19V6M6 11l6-6 6 6" />
        </svg>
      );
    case "refresh":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M20 12a8 8 0 1 1-2.3-5.6M20 3v5h-5" />
        </svg>
      );
    case "terminal":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M4 6l6 6-6 6M12 20h8" />
        </svg>
      );
    case "nodes":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <circle cx="12" cy="5" r="2.4" />
          <circle cx="5" cy="19" r="2.4" />
          <circle cx="19" cy="19" r="2.4" />
          <path d="M10.8 7.1L6.2 16.9M13.2 7.1l4.6 9.8M7.4 19h9.2" />
        </svg>
      );
    case "zap":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M13 2 5 13h6l-1 9 9-12h-6l0-8Z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ————— tiny markdown renderer ————— */
function bold(text: string): ReactNode {
  const parts = text.split("**");
  return <>{parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>))}</>;
}

function inline(text: string, key: number): ReactNode {
  const parts = text.split("`");
  return (
    <span key={key}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <code key={i} className="border border-line bg-bg px-1 py-px font-mono text-[0.92em] text-amber">
            {p}
          </code>
        ) : (
          <span key={i}>{bold(p)}</span>
        ),
      )}
    </span>
  );
}

export function MarkdownLite({ md }: { md: string }) {
  const out: ReactNode[] = [];
  let k = 0;
  let inCode = false;
  let code: string[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      out.push(
        <ul key={k++}>
          {list.map((li, i) => (
            <li key={i}>{inline(li, i)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const flushCode = () => {
    if (code.length) {
      out.push(<pre key={k++}>{code.join("\n")}</pre>);
      code = [];
    }
  };

  for (const raw of md.split("\n")) {
    if (raw.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(raw);
      continue;
    }
    if (raw.startsWith("- ")) {
      list.push(raw.slice(2));
      continue;
    }
    flushList();
    if (raw.startsWith("# ")) out.push(<h1 key={k++}>{inline(raw.slice(2), 0)}</h1>);
    else if (raw.startsWith("## ")) out.push(<h2 key={k++}>{raw.slice(3)}</h2>);
    else if (raw.trim() === "---") out.push(<hr key={k++} />);
    else if (raw.trim()) out.push(<p key={k++}>{inline(raw, 0)}</p>);
  }
  flushList();
  flushCode();
  return <div className="md">{out}</div>;
}

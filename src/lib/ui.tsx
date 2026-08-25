import { ReactNode, useEffect, useRef, useState } from "react";

/* prefers-reduced-motion */
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

/* scramble-decode text effect */
const SCRAMBLE_CHARS = "#%&§@XKRWMZA4701";
export function useScramble(text: string, delay = 0): string {
  const prm = usePRM();
  const [out, setOut] = useState(prm ? text : "");
  useEffect(() => {
    if (prm) {
      setOut(text);
      return;
    }
    let frame = 0;
    let id: number;
    const start = window.setTimeout(() => {
      id = window.setInterval(() => {
        frame += 1;
        const settled = Math.floor((frame - 4) / 2);
        if (settled >= text.length) {
          setOut(text);
          window.clearInterval(id);
          return;
        }
        let s = "";
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (i < settled || c === " ") s += c;
          else s += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
        setOut(s);
      }, 28);
    }, delay);
    return () => {
      window.clearTimeout(start);
      if (id) window.clearInterval(id);
    };
  }, [text, delay, prm]);
  return out;
}

/* scroll reveal wrapper */
export function Reveal({
  children,
  className = "",
  delay = 0,
  from = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "up" | "left" | "right" | "none";
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
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const vars =
    from === "left"
      ? { "--rx": "-34px", "--ry": "0px" }
      : from === "right"
        ? { "--rx": "34px", "--ry": "0px" }
        : from === "none"
          ? { "--rx": "0px", "--ry": "0px" }
          : undefined;
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...vars } as React.CSSProperties}>
      {children}
    </div>
  );
}

/* infinite marquee */
export function Marquee({
  children,
  duration = 30,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  duration?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className="marquee-track flex w-max items-center"
        style={{ animation: `marquee ${duration}s linear infinite`, animationDirection: reverse ? "reverse" : undefined }}
      >
        <div className="flex items-center">{children}</div>
        <div className="flex items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

/* numbered section header */
export function SectionHead({
  no,
  title,
  desc,
}: {
  no: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="border-t-2 border-ink pt-5">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-acc">
            ( {no} )
          </p>
          <h2 className="mt-2 font-grotesk text-4xl font-black uppercase leading-[0.92] tracking-[-0.03em] sm:text-6xl md:text-7xl">
            {title}
          </h2>
        </div>
        {desc && (
          <p className="max-w-xs pb-1 font-mono text-xs leading-relaxed text-mut">{desc}</p>
        )}
      </div>
    </div>
  );
}

/* tiny inline SVG icon set */
export function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "square" as const };
  switch (name) {
    case "bag":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M5 8h14l-1.2 12H6.2L5 8Z" />
          <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
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
    case "check":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M4.5 12.5l5 5L19.5 7" />
        </svg>
      );
    case "dice":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <rect x="4" y="4" width="16" height="16" />
          <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "asterisk":
      return (
        <svg viewBox="0 0 24 24" className={className} {...stroke}>
          <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
        </svg>
      );
    default:
      return null;
  }
}

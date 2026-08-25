import { useEffect, useRef, useState } from "react";
import { FONTS, PANGRAMS } from "../lib/data";
import { Icon, Reveal, SectionHead } from "../lib/ui";

const ALIGNS = [
  { id: "left", d: "M4 6h16M4 12h10M4 18h13" },
  { id: "center", d: "M4 6h16M7 12h10M5.5 18h13" },
  { id: "right", d: "M4 6h16M10 12h10M7 18h13" },
  { id: "justify", d: "M4 6h16M4 12h16M4 18h16" },
] as const;

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2.5 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.18em]">
        <span className={disabled ? "text-mut/60" : "text-mut"}>{label}</span>
        <span className={`tabular-nums ${disabled ? "text-mut/60" : "text-ink"}`}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}

export default function Tester() {
  const [fontId, setFontId] = useState(FONTS[0].id);
  const [size, setSize] = useState(104);
  const [weight, setWeight] = useState(640);
  const [tracking, setTracking] = useState(-0.02);
  const [leading, setLeading] = useState(0.95);
  const [align, setAlign] = useState<(typeof ALIGNS)[number]["id"]>("left");
  const [upper, setUpper] = useState(false);
  const [invert, setInvert] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pangramIdx, setPangramIdx] = useState(0);
  const editRef = useRef<HTMLDivElement>(null);

  const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0];
  const singleCut = font.weights[0] === font.weights[1];

  useEffect(() => {
    setWeight((w) => Math.min(Math.max(w, font.weights[0]), font.weights[1]));
  }, [font]);

  const inject = (text: string) => {
    if (editRef.current) {
      editRef.current.textContent = text;
      editRef.current.focus();
    }
    setIsEmpty(false);
  };

  const surprise = () => {
    const next = (pangramIdx + 1) % PANGRAMS.length;
    setPangramIdx(next);
    inject(PANGRAMS[next]);
  };

  const cssSnippet = `font-family: '${font.name}'; font-size: ${size}px; font-weight: ${weight}; letter-spacing: ${tracking}em; line-height: ${leading};`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cssSnippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const previewStyle: React.CSSProperties = {
    fontFamily: font.family,
    fontSize: `${size}px`,
    fontWeight: weight,
    letterSpacing: `${tracking}em`,
    lineHeight: leading,
    textAlign: align,
    textTransform: upper ? "uppercase" : "none",
  };

  return (
    <section id="tester" className="relative mx-auto max-w-[1400px] px-5 py-20 md:px-10 md:py-28">
      <SectionHead
        no="01"
        title="Type Tester"
        desc="Drag the axes, break the lines. What you set here is exactly what ships — no fakery, no synthetics."
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-14">
        {/* controls */}
        <Reveal from="left" className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-mut">Family</p>
          <div className="space-y-1">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFontId(f.id)}
                className={`group flex w-full items-center justify-between border-l-2 px-4 py-2.5 text-left transition-all duration-200 ${
                  f.id === fontId
                    ? "border-acc bg-card"
                    : "border-transparent hover:border-line hover:bg-card/60"
                }`}
              >
                <span>
                  <span className={`block text-lg leading-tight ${f.css}`} style={{ fontWeight: f.weights[1] >= 700 ? 700 : f.weights[1] }}>
                    {f.name}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mut">
                    {f.category} · {f.styles} styles
                  </span>
                </span>
                <span
                  className={`h-2 w-2 rounded-full transition-all ${
                    f.id === fontId ? "bg-acc" : "bg-line group-hover:bg-mut"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-6 border-t border-line pt-7">
            <Slider label="Size" value={size} display={`${size}px`} min={28} max={240} step={2} onChange={setSize} />
            <Slider
              label={singleCut ? "Weight — single cut" : "Weight"}
              value={weight}
              display={String(weight)}
              min={font.weights[0]}
              max={font.weights[1]}
              step={10}
              disabled={singleCut}
              onChange={setWeight}
            />
            <Slider
              label="Tracking"
              value={tracking}
              display={`${tracking.toFixed(2)}em`}
              min={-0.08}
              max={0.4}
              step={0.01}
              onChange={setTracking}
            />
            <Slider
              label="Leading"
              value={leading}
              display={leading.toFixed(2)}
              min={0.7}
              max={2}
              step={0.05}
              onChange={setLeading}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-7">
            {ALIGNS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAlign(a.id)}
                aria-label={`Align ${a.id}`}
                className={`flex h-10 w-10 items-center justify-center border transition-all ${
                  align === a.id ? "border-ink bg-ink text-bg" : "border-line text-mut hover:border-ink hover:text-ink"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d={a.d} />
                </svg>
              </button>
            ))}
            <button
              onClick={() => setUpper((v) => !v)}
              className={`h-10 border px-3 font-grotesk text-sm font-black transition-all ${
                upper ? "border-ink bg-ink text-bg" : "border-line text-mut hover:border-ink hover:text-ink"
              }`}
              aria-pressed={upper}
            >
              AA
            </button>
            <button
              onClick={() => setInvert((v) => !v)}
              className={`h-10 border px-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-all ${
                invert ? "border-ink bg-ink text-bg" : "border-line text-mut hover:border-ink hover:text-ink"
              }`}
              aria-pressed={invert}
            >
              Invert
            </button>
            <button
              onClick={surprise}
              className="group flex h-10 items-center gap-2 border border-acc px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-acc transition-all hover:bg-acc hover:text-accink"
            >
              <Icon name="dice" className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              Pangram
            </button>
          </div>
        </Reveal>

        {/* live specimen */}
        <Reveal from="right" delay={80}>
          <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-mut">
            <span className="blink inline-block h-3 w-1.5 bg-acc" />
            Live — click the specimen and start typing
          </p>
          <div
            className={`relative border-2 border-ink transition-colors duration-500 ${
              invert ? "bg-ink text-bg" : "bg-card text-ink"
            }`}
          >
            <div className={`pointer-events-none absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.2em] ${invert ? "text-bg/40" : "text-mut"}`}>
              {font.name} — {font.axes}
            </div>
            <div className="relative min-h-[380px] overflow-hidden p-8 pt-12 md:min-h-[460px] md:p-14 md:pt-16">
              {isEmpty && (
                <div
                  className={`pointer-events-none absolute inset-0 select-none p-8 pt-12 md:p-14 md:pt-16 ${invert ? "text-bg/25" : "text-ink/25"}`}
                  style={previewStyle}
                  aria-hidden="true"
                >
                  {font.word}
                </div>
              )}
              <div
                ref={editRef}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                role="textbox"
                aria-label="Type tester input"
                onInput={(e) => setIsEmpty((e.currentTarget.textContent ?? "").trim().length === 0)}
                className="relative break-words outline-none"
                style={previewStyle}
              />
            </div>
            <div
              className={`flex items-center justify-between gap-4 border-t px-4 py-3 font-mono text-[11px] ${
                invert ? "border-bg/20 text-bg/60" : "border-line text-mut"
              }`}
            >
              <span className="truncate">{cssSnippet}</span>
              <button
                onClick={copy}
                className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 uppercase tracking-[0.14em] transition-all ${
                  copied
                    ? "border-acc bg-acc text-accink"
                    : invert
                      ? "border-bg/30 hover:border-bg hover:text-bg"
                      : "border-line hover:border-ink hover:text-ink"
                }`}
              >
                <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy CSS"}
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

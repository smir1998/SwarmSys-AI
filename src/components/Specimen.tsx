import { useState } from "react";
import { FONTS } from "../lib/data";
import { Icon, Marquee, usePRM, useScramble } from "../lib/ui";

const WORD = "Offizin";
const BASE_W = 480;

function weightFor(i: number, hover: number | null): number {
  if (hover === null) return BASE_W;
  const dist = Math.abs(i - hover);
  return Math.max(140, 900 - dist * 185);
}

export default function Specimen() {
  const [hover, setHover] = useState<number | null>(null);
  const prm = usePRM();
  const kicker = useScramble("ZEICHEN SETZEN — TYPE FOUNDRY", 350);

  return (
    <section id="top" className="relative flex min-h-screen flex-col overflow-hidden">
      {/* layered ambient background */}
      <div className="bg-blueprint absolute inset-0" aria-hidden="true" />
      <div
        className="drift pointer-events-none absolute -right-16 top-24 select-none font-antiqua text-[24rem] leading-none text-acc/10 md:text-[34rem]"
        aria-hidden="true"
      >
        §
      </div>
      <div className="pointer-events-none absolute left-[10%] top-[24%] hidden h-3 w-3 rounded-full bg-acc md:block" aria-hidden="true" />
      <div
        className="pointer-events-none absolute bottom-[30%] left-[4%] hidden h-24 w-24 rounded-full border border-line md:block"
        aria-hidden="true"
      />

      {/* meta strip */}
      <div className="relative mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 pt-32 font-mono text-[10px] uppercase tracking-[0.22em] text-mut md:px-10 md:pt-28">
        <span>52.5200° N — 13.4050° E</span>
        <span className="hidden sm:inline">Unabhängige Schriftgießerei</span>
        <span className="text-acc">Est. 1987</span>
      </div>

      {/* the specimen wall */}
      <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-5 py-10 md:px-10">
        <p className="min-h-5 font-mono text-xs tracking-[0.3em] text-mut md:text-sm" aria-label="Zeichen setzen — type foundry">
          {kicker || "\u00A0"}
        </p>

        <h1
          className="mt-2 select-none font-grotesk leading-[0.82] tracking-[-0.045em] text-ink"
          onMouseLeave={() => setHover(null)}
          aria-label="Offizin"
        >
          {WORD.split("").map((ch, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.06em]">
              <span
                className="hero-letter cursor-default text-[clamp(4.6rem,17.5vw,15.5rem)]"
                style={{
                  animationDelay: prm ? undefined : `${120 + i * 70}ms`,
                  fontVariationSettings: `'wght' ${weightFor(i, hover)}, 'wdth' 112`,
                }}
                onMouseEnter={() => setHover(i)}
              >
                {ch}
              </span>
            </span>
          ))}
          <span className="hero-letter text-[clamp(4.6rem,17.5vw,15.5rem)] text-acc" style={{ animationDelay: prm ? undefined : "640ms", fontVariationSettings: "'wght' 900, 'wdth' 112" }}>
            .
          </span>
        </h1>

        <div className="mt-8 flex flex-col gap-8 md:mt-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <p className="font-grotesk text-lg font-medium leading-snug text-ink md:text-xl">
              Five families, forty-nine styles — drawn, hinted and kerned by hand in a
              courtyard workshop in Kreuzberg.
            </p>
            <div className="mt-6 flex items-center gap-5">
              <a
                href="#catalog"
                className="group flex items-center gap-3 bg-ink px-6 py-3.5 font-mono text-xs uppercase tracking-[0.18em] text-bg transition-colors duration-300 hover:bg-acc hover:text-accink"
              >
                Browse the catalog
                <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </a>
              <a href="#tester" className="link-rule font-mono text-xs uppercase tracking-[0.18em] text-mut hover:text-ink">
                Or try the tester ↓
              </a>
            </div>
          </div>

          <dl className="grid grid-cols-4 gap-6 md:gap-10">
            {[
              ["05", "Families"],
              ["49", "Styles"],
              ["127", "Languages"],
              ["2846", "Kerning pairs"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-grotesk text-2xl font-black tabular-nums tracking-tight md:text-4xl">{n}</dd>
                <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mut">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* rotating stamp */}
      <div className="pointer-events-none absolute bottom-28 right-8 hidden h-36 w-36 lg:block" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="spin-slow h-full w-full">
          <defs>
            <path id="circ" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
          </defs>
          <text className="font-mono" fontSize="8.2" letterSpacing="2.4" fill="var(--mut)">
            <textPath href="#circ">OFFIZIN TYPE FOUNDRY · BERLIN · EST 1987 ·</textPath>
          </text>
        </svg>
        <Icon name="asterisk" className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-acc" />
      </div>

      {/* scroll cue */}
      <div className="relative mx-auto flex w-full max-w-[1400px] items-center gap-2 px-5 pb-6 font-mono text-[10px] uppercase tracking-[0.25em] text-mut md:px-10">
        <span className="blink inline-block h-3 w-2 bg-acc" />
        Scroll — the press is warm
      </div>

      {/* foundry ticker */}
      <div className="relative border-y-2 border-ink bg-card py-4">
        <Marquee duration={26}>
          {FONTS.map((f) => (
            <span key={f.id} className="flex items-center">
              <span className={`px-6 text-2xl font-bold md:text-3xl ${f.css}`}>{f.name}</span>
              <Icon name="asterisk" className="h-5 w-5 text-acc" />
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

import { useState } from "react";
import { FONTS, GLYPHS, glyphCategory } from "../lib/data";
import { Reveal, SectionHead } from "../lib/ui";

export default function Glyphs() {
  const [fontId, setFontId] = useState(FONTS[0].id);
  const [glyph, setGlyph] = useState("R");
  const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0];
  const code = `U+${glyph.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`;

  return (
    <section id="glyphs" className="relative border-y-2 border-ink bg-card">
      <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-10 md:py-28">
        <SectionHead
          no="03"
          title="Glyph Inspector"
          desc="Tap any cell. Every glyph below is the real outline — the same one your license ships with."
        />

        <div className="mt-10 flex flex-wrap gap-2">
          {FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontId(f.id)}
              className={`h-10 border px-4 font-mono text-[11px] uppercase tracking-[0.16em] transition-all duration-200 ${
                f.id === fontId
                  ? "border-acc bg-acc text-accink"
                  : "border-line bg-bg text-mut hover:border-ink hover:text-ink"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* detail panel */}
          <Reveal from="left" className="lg:sticky lg:top-28 lg:self-start">
            <div className="border-2 border-ink bg-bg">
              <div className="flex h-64 items-center justify-center overflow-hidden border-b-2 border-ink md:h-72">
                <span
                  key={`${fontId}-${glyph}`}
                  className={`${font.css} select-none text-[10rem] leading-none [animation:pop_0.35s_ease]`}
                  style={{ fontWeight: Math.min(font.weights[1], 600) }}
                >
                  {glyph}
                </span>
              </div>
              <div className="space-y-2.5 p-5 font-mono text-[11px] uppercase tracking-[0.14em]">
                <div className="flex justify-between gap-4">
                  <span className="text-mut">Glyph</span>
                  <span className="font-bold">{glyph === " " ? "Space" : glyph}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-mut">Codepoint</span>
                  <span>{code}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-mut">Category</span>
                  <span>{glyphCategory(glyph)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-mut">Family</span>
                  <span className="text-right">{font.name}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-line pt-2.5">
                  <span className="text-mut">Also cut as</span>
                  <span>{font.italic ? "Roman · Italic" : "Roman only"}</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* grid */}
          <Reveal from="right" delay={80}>
            <div
              className="grid grid-cols-6 gap-px border-2 border-ink bg-line sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12"
              role="grid"
              aria-label={`Glyph set of ${font.name}`}
            >
              {GLYPHS.map((g) => {
                const active = g === glyph;
                return (
                  <button
                    key={g}
                    role="gridcell"
                    onClick={() => setGlyph(g)}
                    aria-label={`Inspect glyph ${g}`}
                    className={`flex aspect-square items-center justify-center text-xl transition-colors duration-150 md:text-2xl ${font.css} ${
                      active
                        ? "bg-ink text-bg"
                        : "bg-bg hover:bg-acc hover:text-accink"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
              {GLYPHS.length} of 740+ glyphs shown · full set includes small caps, ligatures &amp; tabular figures
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

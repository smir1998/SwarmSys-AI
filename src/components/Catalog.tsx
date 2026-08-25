import { FONTS, fmtEUR } from "../lib/data";
import { Icon, Reveal, SectionHead } from "../lib/ui";

export default function Catalog({
  cart,
  onToggle,
}: {
  cart: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <section id="catalog" className="relative mx-auto max-w-[1400px] px-5 py-20 md:px-10 md:py-28">
      <SectionHead
        no="02"
        title="The Catalog"
        desc="Every family is licensed per foundry — desktop, web and embedding in one price. No subscription, no metering."
      />

      <div className="mt-12 grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-16">
        {/* sticky index */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal from="left">
            <p className="font-grotesk text-2xl font-black leading-tight tracking-tight md:text-3xl">
              Thirty-nine years of metal,
              <br />
              now shipped as <span className="text-acc">axes.</span>
            </p>
            <p className="mt-5 max-w-[34ch] font-grotesk text-sm leading-relaxed text-mut">
              We still proof every master on paper before it becomes a binary. Variable where it
              earns its keep, static where it doesn't.
            </p>

            <div className="mt-8 border-t-2 border-ink">
              {FONTS.map((f, i) => (
                <a
                  key={f.id}
                  href={`#row-${f.id}`}
                  className="group flex items-baseline justify-between gap-3 border-b border-line py-3 transition-all duration-200 hover:bg-card hover:pl-2"
                >
                  <span className="font-mono text-[10px] text-acc">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`flex-1 text-lg font-bold leading-tight ${f.css}`}>{f.name}</span>
                  <span className="font-mono text-[11px] tabular-nums text-mut">{fmtEUR(f.price)}</span>
                  <Icon name="up" className="h-3.5 w-3.5 rotate-45 text-mut transition-all group-hover:text-acc" />
                </a>
              ))}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
              Prices per family · excl. VAT
            </p>
          </Reveal>
        </div>

        {/* font rows */}
        <div>
          {FONTS.map((f, i) => {
            const inCart = cart.includes(f.id);
            return (
              <Reveal key={f.id} delay={i * 60}>
                <article
                  id={`row-${f.id}`}
                  className="group grid scroll-mt-28 gap-7 border-t-2 border-ink py-10 transition-colors duration-300 hover:bg-card md:grid-cols-[1fr_230px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-4 font-mono text-[10px] uppercase tracking-[0.2em] text-mut">
                      <span className="text-acc">{String(i + 1).padStart(2, "0")}</span>
                      <span>{f.category}</span>
                      <span>Drawn {f.year}</span>
                      <span>Axes: {f.axes}</span>
                      {f.isNew && (
                        <span className="bg-acc px-1.5 py-0.5 text-accink">New — 2026</span>
                      )}
                    </div>

                    <h3
                      className={`spec-word mt-4 break-words text-[clamp(2.6rem,6.5vw,4.8rem)] leading-[0.95] tracking-tight ${f.css}`}
                    >
                      {f.word}
                    </h3>

                    <p className="mt-5 max-w-xl font-grotesk text-sm leading-relaxed text-mut">{f.blurb}</p>
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-mut">
                      Designed by {f.designer} · {f.styles} styles{f.italic ? " · incl. true italics" : ""}
                    </p>
                  </div>

                  <div className="flex flex-row items-end justify-between gap-4 md:flex-col md:items-end md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="font-grotesk text-4xl font-black tabular-nums tracking-tight">
                        {fmtEUR(f.price)}
                      </p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
                        per family
                      </p>
                    </div>
                    <button
                      onClick={() => onToggle(f.id)}
                      className={`flex items-center gap-2.5 px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all duration-300 ${
                        inCart
                          ? "border-2 border-acc bg-transparent text-acc hover:bg-acc/10"
                          : "bg-ink text-bg hover:bg-acc hover:text-accink"
                      }`}
                      aria-pressed={inCart}
                    >
                      <Icon name={inCart ? "check" : "arrow"} className="h-4 w-4" />
                      {inCart ? "In cart" : "License"}
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
          <div className="border-t-2 border-ink py-6 font-mono text-[11px] uppercase tracking-[0.18em] text-mut">
            End of press sheet — 05 of 05 families shown. Custom cuts on request:{" "}
            <a href="mailto:werkstatt@offizin.example" className="text-acc underline-offset-4 hover:underline">
              werkstatt@offizin.example
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

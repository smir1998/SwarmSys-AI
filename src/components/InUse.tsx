import { PAIRINGS } from "../lib/data";
import { Icon, Reveal, SectionHead } from "../lib/ui";

const POSTERS = [
  {
    caption: "01 — Pylon & Fern Mono · Tonhalle Berlin, 2026",
    bg: "bg-acc",
    fg: "text-[#f6f0e6]",
    node: (
      <div className="flex h-full flex-col justify-between p-6 md:p-8">
        <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.2em] md:text-[11px]">
          <span>Tonhalle</span>
          <span>Sa 21.06</span>
        </div>
        <h3 className="font-pylon text-[clamp(3.4rem,7vw,6rem)] uppercase leading-[0.86]">
          Live in
          <br />
          Concrete
        </h3>
        <div className="space-y-2">
          <p className="font-kiosk text-xl font-bold md:text-2xl">mit: Die Nerven · Frau Krause · Ufo361er</p>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] md:text-[11px]">
            <span>22:00 — Einlass</span>
            <span>AK 18 €</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    caption: "02 — Meridian Antiqua · Das Magazin Nº47",
    bg: "bg-[#f4f2ea]",
    fg: "text-[#17150e]",
    node: (
      <div className="flex h-full flex-col justify-between p-6 md:p-8">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-[#2438c9] md:text-[11px]">
          <span>Das Magazin</span>
          <span>Nº 47 — Herbst</span>
        </div>
        <h3 className="font-antiqua text-[clamp(2.6rem,5.5vw,4.6rem)] font-black italic leading-[0.95]">
          Die neue
          <br />
          Sachlichkeit.
        </h3>
        <div className="space-y-3">
          <p className="max-w-[34ch] font-grotesk text-xs leading-relaxed text-[#17150e]/70 md:text-sm">
            Wie eine Berliner Gießerei lernte, das Unordentliche zu lieben — und warum ihre
            Antiqua trotzdem pünktlich ist.
          </p>
          <div className="h-[3px] w-12 bg-[#e03d1d]" />
        </div>
      </div>
    ),
  },
  {
    caption: "03 — Pylon & Fern Mono · BVG Nachtlinie",
    bg: "bg-[#15150f]",
    fg: "text-[#ece8dc]",
    node: (
      <div className="flex h-full flex-col justify-between p-6 md:p-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ece8dc]/50 md:text-[11px]">
          BVG · Nachtlinie
        </div>
        <div className="flex items-end gap-5">
          <h3 className="font-pylon text-[clamp(4.5rem,9vw,8rem)] uppercase leading-[0.8]">U8</h3>
          <p className="pb-2 font-mono text-xs uppercase tracking-[0.16em] text-[#ece8dc]/70 md:text-sm">
            Richtung
            <br />
            Hermannstr.
          </p>
        </div>
        <div className="space-y-1.5 font-mono text-xs tabular-nums md:text-sm">
          <div className="flex justify-between border-b border-[#ece8dc]/15 pb-1.5">
            <span>Kottbusser Tor</span>
            <span>03:12</span>
          </div>
          <div className="flex justify-between border-b border-[#ece8dc]/15 pb-1.5">
            <span>Hermannplatz</span>
            <span>03:19</span>
          </div>
          <div className="flex justify-between text-[#8f9bff]">
            <span>Hermannstr.</span>
            <span>03:27</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    caption: "04 — Kiosk & Spree Grotesk · Späti am Eck",
    bg: "bg-acc2",
    fg: "text-[#f3f1e9]",
    node: (
      <div className="flex h-full flex-col justify-between p-6 md:p-8">
        <div className="flex items-start justify-between">
          <Icon name="asterisk" className="h-8 w-8 text-[#f3f1e9]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] md:text-[11px]">Seit 1994</span>
        </div>
        <h3 className="font-kiosk text-[clamp(3.6rem,7.5vw,6.5rem)] font-extrabold uppercase leading-[0.85] tracking-tight">
          Späti
          <br />
          am Eck
        </h3>
        <div className="space-y-2">
          <p className="font-grotesk text-sm font-medium md:text-base">
            Kalte Getränke, warme Worte, frische Zeitungen.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#f3f1e9]/70 md:text-[11px]">
            Offen bis 4 Uhr — Weserstr. / Ecke
          </p>
        </div>
      </div>
    ),
  },
];

export default function InUse() {
  return (
    <section id="inuse" className="mx-auto max-w-[1400px] px-5 py-20 md:px-10 md:py-28">
      <SectionHead
        no="04"
        title="In Use"
        desc="Posters, timetables and corner shops — our families at work around the city that raised them."
      />

      <div className="mt-12 grid gap-6 sm:grid-cols-2 md:gap-8">
        {POSTERS.map((p, i) => (
          <Reveal key={p.caption} delay={(i % 2) * 110}>
            <figure className="group">
              <div
                className={`relative aspect-[3/4] overflow-hidden border-2 border-ink shadow-[var(--shadow)] transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:rotate-[-1.2deg] ${p.bg} ${p.fg}`}
              >
                {p.node}
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.09)_50%,transparent_70%)]" />
              </div>
              <figcaption className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
                <span>{p.caption}</span>
                <Icon name="arrow" className="h-3.5 w-3.5 -rotate-45 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-acc" />
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      {/* pairings */}
      <div className="mt-20">
        <Reveal>
          <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-acc">
            ( Tried pairings )
            <span className="h-px flex-1 bg-line" />
          </p>
        </Reveal>
        <div>
          {PAIRINGS.map((p, i) => (
            <Reveal key={p.display + p.body} delay={i * 60}>
              <div className="group grid items-baseline gap-x-6 gap-y-1 border-b border-line py-5 transition-all duration-300 hover:bg-card hover:pl-3 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto]">
                <span className="font-kiosk text-2xl font-bold tracking-tight md:text-3xl">{p.display}</span>
                <span className="font-grotesk text-lg font-light text-ink/80 md:text-xl">+ {p.body}</span>
                <span className="font-mono text-[11px] text-mut">{p.note}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

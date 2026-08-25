import { useState } from "react";
import { FONTS } from "../lib/data";
import { Icon, Marquee } from "../lib/ui";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subState, setSubState] = useState<"idle" | "done" | "error">("idle");

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || email.length < 5) {
      setSubState("error");
      return;
    }
    setSubState("done");
  };

  return (
    <footer id="colophon" className="relative overflow-hidden border-t-2 border-ink">
      {/* giant outline marquee */}
      <div className="border-b border-line py-6">
        <Marquee duration={40} reverse>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="flex items-center">
              <span className={`px-6 font-grotesk text-7xl font-black uppercase tracking-tight md:text-8xl ${i % 2 ? "stroke-faint" : "text-ink"}`}>
                Offizin
              </span>
              <Icon name="asterisk" className="h-8 w-8 text-acc" />
            </span>
          ))}
        </Marquee>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1.4fr] md:px-10">
        <div>
          <a href="#top" className="flex items-baseline gap-2.5">
            <span className="inline-block h-4 w-4 translate-y-[-1px] bg-acc" />
            <span className="font-grotesk text-2xl font-black uppercase tracking-tight">
              Offizin<span className="align-super text-[10px] font-bold text-mut">®</span>
            </span>
          </a>
          <p className="mt-5 max-w-[36ch] font-grotesk text-sm leading-relaxed text-mut">
            Independent type foundry in a Kreuzberg courtyard. We draw letters, proof them on
            paper, and ship them as honest binaries.
          </p>
          <address className="mt-6 font-mono text-[11px] not-italic uppercase leading-relaxed tracking-[0.14em] text-mut">
            Oranienstraße 24 — Hof, 2. OG
            <br />
            10999 Berlin, Germany
          </address>
        </div>

        <nav aria-label="Fonts">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-acc">Fonts</p>
          <ul className="mt-5 space-y-3">
            {FONTS.map((f) => (
              <li key={f.id}>
                <a href={`#row-${f.id}`} className={`link-rule text-lg font-bold ${f.css}`}>
                  {f.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Foundry">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-acc">Foundry</p>
          <ul className="mt-5 space-y-3 font-grotesk text-sm font-medium">
            {[
              ["Specimen wall", "#top"],
              ["Type tester", "#tester"],
              ["Glyph inspector", "#glyphs"],
              ["In use", "#inuse"],
              ["Custom cuts", "mailto:werkstatt@offizin.example"],
            ].map(([label, href]) => (
              <li key={href}>
                <a href={href} className="link-rule text-mut hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-acc">Post aus der Werkstatt</p>
          <p className="mt-5 font-grotesk text-sm leading-relaxed text-mut">
            A letter every few months — new releases, kerning confessions, specimen PDFs. No noise.
          </p>
          {subState === "done" ? (
            <p className="mt-6 flex items-center gap-2.5 border border-acc px-4 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-acc [animation:pop_0.4s_ease]">
              <Icon name="check" className="h-4 w-4" /> Danke — check your inbox.
            </p>
          ) : (
            <form onSubmit={subscribe} className="mt-6">
              <div className="flex border-2 border-ink transition-colors focus-within:border-acc">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (subState === "error") setSubState("idle");
                  }}
                  placeholder="du@beispiel.de"
                  aria-label="Email address"
                  className="w-full bg-transparent px-4 py-3 font-mono text-xs text-ink outline-none placeholder:text-mut/60"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-ink px-5 font-mono text-[11px] uppercase tracking-[0.16em] text-bg transition-colors hover:bg-acc hover:text-accink"
                >
                  Send
                </button>
              </div>
              {subState === "error" && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-acc">
                  Hmm — that address doesn't look typeset.
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-6 font-mono text-[10px] uppercase tracking-[0.18em] text-mut md:px-10">
          <span>© 2026 Offizin Type Foundry GmbH</span>
          <span className="hidden md:inline">Set in Spree Grotesk &amp; Meridian Antiqua</span>
          <a
            href="#top"
            className="group flex items-center gap-2 border border-line px-4 py-2.5 transition-all hover:border-acc hover:text-acc"
          >
            Back to top
            <Icon name="up" className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-1" />
          </a>
        </div>
      </div>
    </footer>
  );
}

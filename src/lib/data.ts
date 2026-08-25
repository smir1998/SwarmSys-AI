export type FoundryFont = {
  id: string;
  name: string;
  family: string; // CSS font-family
  css: string; // tailwind font utility
  category: string;
  designer: string;
  year: number;
  styles: number;
  weights: [number, number];
  italic: boolean;
  axes: string;
  price: number;
  word: string;
  blurb: string;
  isNew?: boolean;
};

export const FONTS: FoundryFont[] = [
  {
    id: "spree",
    name: "Spree Grotesk",
    family: "'Archivo', sans-serif",
    css: "font-grotesk",
    category: "Grotesque",
    designer: "Greta Voss",
    year: 2019,
    styles: 18,
    weights: [100, 900],
    italic: true,
    axes: "wght · wdth",
    price: 340,
    word: "Hamburgefonstiv",
    blurb:
      "A workhorse grotesque drawn for wayfinding, timetables and stubborn editorial grids. Nine weights, true italics, zero temperament.",
  },
  {
    id: "meridian",
    name: "Meridian Antiqua",
    family: "'Fraunces', Georgia, serif",
    css: "font-antiqua",
    category: "Antiqua",
    designer: "Ilya Brandt",
    year: 2021,
    styles: 14,
    weights: [100, 900],
    italic: true,
    axes: "wght · opsz",
    price: 290,
    word: "Quo vadis, Berlin?",
    blurb:
      "A high-contrast antiqua with soft terminals and a wonky optical size — equally at home in a novel and on a neon marquee.",
  },
  {
    id: "fern",
    name: "Fern Mono",
    family: "'Space Mono', ui-monospace, monospace",
    css: "font-mono",
    category: "Monospace",
    designer: "June Okafor",
    year: 2017,
    styles: 4,
    weights: [400, 700],
    italic: true,
    axes: "wght",
    price: 170,
    word: "08:15 → TXL",
    blurb:
      "A typewriter soul with terminal manners. Tabular figures, honest punctuation, two weights of dry wit.",
  },
  {
    id: "pylon",
    name: "Pylon",
    family: "'Anton', Impact, sans-serif",
    css: "font-pylon",
    category: "Condensed Display",
    designer: "Tomás Reyes",
    year: 2015,
    styles: 1,
    weights: [400, 400],
    italic: false,
    axes: "—",
    price: 95,
    word: "NACHTSCHICHT",
    blurb:
      "One weight, drawn at arm's length. A condensed shout for posters that must be read from a moving tram.",
  },
  {
    id: "kiosk",
    name: "Kiosk",
    family: "'Bricolage Grotesque', sans-serif",
    css: "font-kiosk",
    category: "Display Grotesque",
    designer: "Mara Lindqvist",
    year: 2026,
    styles: 12,
    weights: [200, 800],
    italic: false,
    axes: "wght · opsz",
    price: 260,
    word: "Späti & Söhne",
    blurb:
      "A display grotesque with ink traps and opinions. Slightly warm, slightly crooked — like its namesake corner shop.",
    isNew: true,
  },
];

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ".split("");
const LOWER = "abcdefghijklmnopqrstuvwxyzäöüß".split("");
const DIGITS = "0123456789".split("");
const SYMBOLS = "&@#§€%‰?*!(){}[]/\\+=~−·:;".split("");
export const GLYPHS: string[] = [...UPPER, ...LOWER, ...DIGITS, ...SYMBOLS];

export function glyphCategory(g: string): string {
  if (/[A-ZÄÖÜ]/.test(g)) return "Uppercase";
  if (/[a-zäöüß]/.test(g)) return "Lowercase";
  if (/[0-9]/.test(g)) return "Figure";
  return "Punctuation";
}

export const PANGRAMS: string[] = [
  "Zwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.",
  "The quick brown fox jumps over the lazy dog — 0123456789.",
  "Falsches Üben von Xylophonmusik quält jeden größeren Zwerg.",
  "Victor jagt zwölf Boxkämpfer quer über den großen Würfeltisch.",
  "Pack my box with five dozen liquor jugs — & mind the € sign!",
];

export const PAIRINGS: { display: string; body: string; note: string }[] = [
  { display: "Pylon", body: "Spree Grotesk Light", note: "The classic poster-and-credit block." },
  { display: "Meridian Antiqua Black", body: "Fern Mono", note: "Editorial heat with footnote precision." },
  { display: "Kiosk ExtraBold", body: "Spree Grotesk Regular", note: "Warm headlines, cool running text." },
  { display: "Meridian Antiqua Italic", body: "Kiosk Regular", note: "A love letter set in two temperatures." },
];

export const fmtEUR = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

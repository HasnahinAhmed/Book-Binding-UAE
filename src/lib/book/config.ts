export type MaterialKind = "leather" | "cloth";
export type FormatKind = "a4" | "textbook" | "journal";
export type BackgroundKind = "studio-grey" | "sand" | "teal" | "white" | "dark" | "transparent";
export type FoilKind = "gold" | "silver";
export type SpineKind = "rounded" | "square";
/** logo placement on the front cover — matches the two real-product styles:
 *  "top" = centred at the head, stacked ABOVE the bilingual university name
 *  (most bound theses); "corner" = small logo in the top-left corner,
 *  government-report style (e.g. Government of Dubai covers) */
export type LogoPositionKind = "top" | "corner";

/** cover lettering mode: the guided template (auto layout from the form
 *  fields) or the freehand white-paper editor (Google-Docs-style blocks
 *  the user drags, resizes and edits directly) */
export type CoverMode = "guided" | "freehand";

/** one block on the freehand white-paper cover editor. Positions/sizes are
 *  in MILLIMETRES on the physical cover, so the same numbers drive both the
 *  on-screen paper and the hot-stamped 3D foil artwork (true WYSIWYG). */
export interface CoverElement {
  id: string;
  kind: "text" | "logo";
  /** text content; "\n" = paragraph break (text blocks only) */
  text: string;
  /** anchor x in mm — the left edge / centre / right edge of the block
   *  depending on `align`, so switching alignment never jumps the text */
  x: number;
  /** top of the block in mm — first line top for text, box top for the logo */
  y: number;
  /** font size in mm (text) or logo box width in mm */
  size: number;
  weight: "400" | "600" | "700";
  italic: boolean;
  align: "left" | "center" | "right";
  /** word-wrap width in mm */
  width: number;
  /** line-height multiplier */
  lineHeight: number;
  family: "serif" | "sans";
}

/** font stacks shared by the white-paper editor (CSS) and the foil stamp
 *  (canvas) — the exact same families so the paper is what gets stamped */
export const FONT_STACKS: Record<"serif" | "sans" | "arabic", string> = {
  serif: '"Tinos", "Times New Roman", "Liberation Serif", Georgia, serif',
  sans: '"Carlito", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  arabic:
    '"Noto Naskh Arabic", "Amiri", "Traditional Arabic", "Geeza Pro", "Times New Roman", serif',
};

/** pick the canvas/CSS font for a block — Arabic glyphs automatically get
 *  the Naskh stack regardless of the chosen family */
export function fontStackFor(family: "serif" | "sans", text: string): string {
  return /[\u0600-\u06FF]/.test(text) ? FONT_STACKS.arabic : FONT_STACKS[family];
}

export interface BookFormat {
  label: string;
  /** cover width in mm (spine to fore-edge) */
  W: number;
  /** cover height in mm */
  H: number;
  /** default page block thickness in mm */
  T: number;
}

export const FORMATS: Record<FormatKind, BookFormat> = {
  a4: { label: "A4 Thesis (210×297)", W: 210, H: 297, T: 42 },
  textbook: { label: "Textbook (170×240)", W: 170, H: 240, T: 30 },
  journal: { label: "Journal (180×235)", W: 180, H: 235, T: 26 },
};

export interface BookConfig {
  // cover text
  university: string;
  /** Arabic institution name rendered under the logo (e.g. جامعة عجمان) */
  universityArabic: string;
  college: string;
  department: string;
  title: string;
  /** optional Arabic thesis title — stamped under the English title */
  titleArabic: string;
  subtitle: string;
  company: string;
  author: string;
  /** optional Arabic student name — stamped under the English name */
  authorArabic: string;
  authorId: string;
  supervisor: string;
  year: string;
  /** user-uploaded logo (data URL) — empty string keeps the drawn university seal */
  logoDataUrl: string;
  /** logo placement: centred above the name block (default) or top-left corner */
  logoPosition: LogoPositionKind;
  // binding
  coverColor: string;
  material: MaterialKind;
  foil: FoilKind;
  format: FormatKind;
  /** spine construction: rounded (classic convex arc) or square (flat back) */
  spineStyle: SpineKind;
  thickness: number;
  headband: string;
  // cover artwork style
  /** stamping colour for all cover/spine typography (hex) */
  textColor: string;
  /** brightness multiplier for the stamped artwork (0.6–1.6) */
  textBrightness: number;
  // details
  showFoil: boolean;
  cornerGuards: boolean;
  stitching: boolean;
  goldBorder: boolean;
  // scene
  background: BackgroundKind;
  autoRotate: boolean;
  float: boolean;
  /** camera distance multiplier — >1 pulls the camera back so the book reads
   *  smaller inside the SAME canvas (hero leaves room for overlay controls) */
  zoom?: number;
  /** allow wheel-zoom inside the canvas — configurator yes, hero no: over
   *  the hero book the wheel must scroll the PAGE, not zoom the model */
  scrollZoom?: boolean;
  /** let vertical touch gestures scroll the page instead of rotating —
   *  horizontal drags still rotate (hero + embedded panes) */
  touchScroll?: boolean;
  /** right-to-left binding: Arabic theses open from the LEFT, so the spine
   *  sits on the RIGHT of the front cover and the page block (fore-edge)
   *  shows on the left — the cover texture is pre-mirrored so the artwork
   *  still reads correctly on the mirrored mesh */
  rtl?: boolean;
  /** stamp title/university/year on the spine (spine printing add-on) */
  spineText?: boolean;
  /** language of the printed captions ("Submitted by" / "إعداد") */
  labelLang?: "en" | "ar" | "both";
  // freehand white-paper editor ("design it yourself")
  /** "guided" = auto template from the text fields; "freehand" = the
   *  CoverElement blocks below are stamped exactly as placed */
  coverMode?: CoverMode;
  /** the white-paper editor's document — empty/absent falls back to guided */
  coverElements?: CoverElement[];
}

export const FOIL_COLORS: Record<FoilKind, { hex: string; label: string }> = {
  // pale champagne gold — matches the matte hot-stamping foil in the references
  gold: { hex: "#C9A24B", label: "Gold" },
  silver: { hex: "#C9CCD1", label: "Silver" },
};

export const COVER_SWATCHES: { hex: string; label: string }[] = [
  { hex: "#F2EDE3", label: "Ivory" },
  { hex: "#141518", label: "Black" },
  { hex: "#5E1F26", label: "Maroon" },
  { hex: "#1B2A41", label: "Navy" },
  { hex: "#3D3F41", label: "Charcoal" },
  { hex: "#27352B", label: "Forest" },
  { hex: "#4A2E1F", label: "Walnut" },
];

/** stamping colours for the cover typography — gold family + neutrals */
export const TEXT_COLOR_SWATCHES: { hex: string; label: string }[] = [
  { hex: "#C9A24B", label: "Gold" },
  { hex: "#E6CE8B", label: "Champagne" },
  { hex: "#F6D678", label: "Bright Gold" },
  { hex: "#C9CCD1", label: "Silver" },
  { hex: "#F4F1E8", label: "White" },
  { hex: "#26221C", label: "Black" },
  // playground-only foil families (free-design mode unlocks these)
  { hex: "#B87333", label: "Copper" },
  { hex: "#E0A899", label: "Rose Gold" },
];

export const HEADBAND_COLORS: { hex: string; label: string }[] = [
  { hex: "#E5DFCE", label: "Ivory" },
  { hex: "#8B2E2E", label: "Crimson" },
  { hex: "#1B3A5C", label: "Navy" },
  { hex: "#C9A24B", label: "Gold" },
  { hex: "#4A4A46", label: "Neutral" },
];

export const BACKGROUNDS: Record<BackgroundKind, { color: string; label: string; dark: boolean }> = {
  "studio-grey": { color: "#E9EAEA", label: "Studio Grey", dark: false },
  sand: { color: "#D9CFC2", label: "Sand", dark: false },
  teal: { color: "#4FB8AD", label: "Teal", dark: false },
  white: { color: "#F5F5F3", label: "White", dark: false },
  dark: { color: "#101114", label: "Noir", dark: true },
  /** page background shows through the canvas (hero / embedded previews) */
  transparent: { color: "#FFFFFF", label: "Transparent", dark: false },
};

export const DEFAULT_CONFIG: BookConfig = {
  // cover text — Ajman University internship report (user reference)
  university: "Ajman University",
  universityArabic: "جامعة عجمان",
  college: "College of Engineering and Information Technology",
  department: "Department of Electrical and Computer Engineering",
  title: "Internship Training Report",
  titleArabic: "",
  subtitle:
    "A report submitted as partial fulfilment of the requirements for the Degree of Bachelor of Science in Electrical Engineering",
  company: "Municipality and Planning Department - Ajman",
  author: "Fatima Ameen Alawadhi",
  authorArabic: "",
  authorId: "ID: 202211016",
  supervisor: "Dr. Zulfiqar Memon",
  year: "August 2026",
  logoDataUrl: "",
  logoPosition: "top",
  rtl: false,
  // binding
  coverColor: "#F2EDE3",
  material: "cloth",
  foil: "gold",
  format: "a4",
  spineStyle: "rounded",
  thickness: 34,
  headband: "#E5DFCE",
  textColor: "#C9A24B",
  textBrightness: 1,
  // details
  showFoil: true,
  cornerGuards: false,
  stitching: false,
  goldBorder: false,
  // scene
  background: "sand",
  autoRotate: false,
  float: true,
  zoom: 1,
};

/** empty new-fields profile used by the classic thesis presets */
const THESIS_TEXT: Pick<
  BookConfig,
  | "universityArabic"
  | "college"
  | "department"
  | "titleArabic"
  | "company"
  | "authorArabic"
  | "authorId"
  | "supervisor"
> = {
  universityArabic: "",
  college: "",
  department: "",
  titleArabic: "",
  company: "",
  authorArabic: "",
  authorId: "",
  supervisor: "",
};

export interface Preset {
  id: string;
  name: string;
  hint: string;
  swatch: string;
  config: Partial<BookConfig>;
}

export const PRESETS: Preset[] = [
  {
    id: "ajman-internship",
    name: "Ajman Internship",
    hint: "Ivory cloth · full report text",
    swatch: "#F2EDE3",
    config: { ...DEFAULT_CONFIG },
  },
  {
    id: "aus-thesis",
    name: "AUS Thesis",
    hint: "Fine black cloth · clean gold",
    swatch: "#1A1B1E",
    config: {
      ...THESIS_TEXT,
      university: "American University of Sharjah",
      title:
        "A Comprehensive Framework for Optimizing and Integrating Electric Bus Service with Smart Grids for Sustainable Public Transportation",
      subtitle:
        "A Thesis presented to the Faculty of the American University of Sharjah College of Engineering In Partial Fulfillment of the Requirements for the Degree of Master of Science in Electrical Engineering",
      author: "Aisha Abdalla AlAli",
      year: "May 2025",
      coverColor: "#1A1B1E",
      material: "cloth",
      foil: "gold",
      format: "a4",
      thickness: 40,
      headband: "#4A4A46",
      textColor: "#C9A24B",
      cornerGuards: false,
      stitching: false,
      goldBorder: false,
      showFoil: true,
      background: "white",
    },
  },
  {
    id: "thesis-black",
    name: "Thesis Black",
    hint: "Gold foil · brass corners",
    swatch: "#141518",
    config: {
      coverColor: "#141518",
      material: "leather",
      foil: "gold",
      format: "a4",
      thickness: 42,
      cornerGuards: true,
      stitching: true,
      goldBorder: true,
      showFoil: true,
      textColor: "#C9A24B",
      background: "studio-grey",
    },
  },
  {
    id: "thesis-maroon",
    name: "Thesis Maroon",
    hint: "Burgundy library binding",
    swatch: "#5E1F26",
    config: {
      ...THESIS_TEXT,
      coverColor: "#5E1F26",
      material: "leather",
      foil: "gold",
      format: "a4",
      thickness: 38,
      cornerGuards: true,
      stitching: true,
      goldBorder: true,
      showFoil: true,
      textColor: "#C9A24B",
      background: "studio-grey",
    },
  },
  {
    id: "library-navy",
    name: "Library Navy",
    hint: "Stitched · corner guards",
    swatch: "#1B2A41",
    config: {
      ...THESIS_TEXT,
      coverColor: "#1B2A41",
      material: "leather",
      foil: "gold",
      format: "a4",
      thickness: 48,
      cornerGuards: true,
      stitching: true,
      goldBorder: false,
      showFoil: true,
      textColor: "#C9A24B",
      background: "white",
    },
  },
  {
    id: "charcoal-journal",
    name: "Charcoal Journal",
    hint: "Blank cloth · rounded spine",
    swatch: "#3D3F41",
    config: {
      ...THESIS_TEXT,
      coverColor: "#3D3F41",
      material: "cloth",
      format: "journal",
      thickness: 26,
      cornerGuards: false,
      stitching: false,
      goldBorder: false,
      showFoil: false,
      headband: "#4A4A46",
      background: "white",
    },
  },
  {
    id: "teal-showcase",
    name: "Teal Showcase",
    hint: "Product hero shot",
    swatch: "#0F1214",
    config: {
      ...THESIS_TEXT,
      coverColor: "#0F1214",
      material: "leather",
      foil: "gold",
      format: "a4",
      thickness: 44,
      cornerGuards: true,
      stitching: true,
      goldBorder: true,
      showFoil: true,
      textColor: "#C9A24B",
      background: "teal",
    },
  },
];

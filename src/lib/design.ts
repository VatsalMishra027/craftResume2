/**
 * The design layer: a handful of tweaks a person can lay over any layout.
 *
 * Everything here is additive. A resume with no tweaks produces an empty class
 * string and an empty style string, so the sheet is byte-for-byte what it was
 * before this module existed. Tweaks travel as CSS custom properties plus a
 * gate class (`ds-mg`, `ds-sp`, `ds-lh`) that the matching rules at the end of
 * resume.css key off — the layouts' own rules are never edited.
 *
 * Stored on its own, like typeface and size: the resume content, imports and
 * blueprints never see it.
 */

export interface Design {
  /** A custom accent as `#rrggbb`, or '' to use the chosen preset colour. */
  color: string;
  /** Page margins, as a percentage of the layout's own. 100 = untouched. */
  margin: number;
  /** Gap between sections, as a percentage of the layout's own. 100 = untouched. */
  space: number;
  /** Body line height × 100 (e.g. 150). 0 = the layout's own. */
  lineHeight: number;
}

export const DEFAULT_DESIGN: Readonly<Design> = Object.freeze({
  color: '',
  margin: 100,
  space: 100,
  lineHeight: 0,
});

/** Slider ranges. Clamped on read, so no stored value can break a layout. */
export const DESIGN_LIMITS = {
  margin: { min: 75, max: 125, step: 5 },
  space: { min: 70, max: 140, step: 5 },
  lineHeight: { min: 125, max: 175, step: 5 },
} as const;

/**
 * Layouts whose margin is a plain padding on the sheet. The rest — the rails,
 * bands and framed headers — draw their own edges, so a margin slider has
 * nothing honest to move there. Keep in step with the `.ds-mg` rules in
 * resume.css, which carry each layout's own padding as the base.
 */
export const MARGIN_TEMPLATES: ReadonlySet<string> = new Set([
  'ledger',
  'scholar',
  'beacon',
  'meridian',
  'cascade',
  'lattice',
  'helix',
  'orbit',
]);

const HEX = /^#[0-9a-f]{6}$/i;

function clamp(value: unknown, min: number, max: number, step: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const snapped = Math.round(n / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

export function normaliseDesign(raw: unknown): Design {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const { margin, space, lineHeight } = DESIGN_LIMITS;
  const lh = Number(r.lineHeight);
  return {
    color: typeof r.color === 'string' && HEX.test(r.color) ? r.color.toLowerCase() : '',
    margin: clamp(r.margin, margin.min, margin.max, margin.step, 100),
    space: clamp(r.space, space.min, space.max, space.step, 100),
    lineHeight:
      Number.isFinite(lh) && lh > 0
        ? clamp(lh, lineHeight.min, lineHeight.max, lineHeight.step, 0)
        : 0,
  };
}

export function isDefaultDesign(design: Design): boolean {
  return (
    !design.color && design.margin === 100 && design.space === 100 && design.lineHeight === 0
  );
}

/** A lighter, still-saturated partner for the highlight colour of a custom accent. */
export function accentHighlight(hex: string): string {
  const m = HEX.test(hex) ? hex.slice(1) : '1e3a5f';
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  const L = 0.7;
  const S = Math.min(0.8, Math.max(0.35, s));
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const off = L - c / 2;
  const [rr, gg, bb] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hexPart = (v: number) =>
    Math.round((v + off) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hexPart(rr)}${hexPart(gg)}${hexPart(bb)}`;
}

/** Gate classes for the sheet — '' when there is nothing to apply. */
export function designClass(design: Design, templateId: string): string {
  const classes: string[] = [];
  if (design.margin !== 100 && MARGIN_TEMPLATES.has(templateId)) classes.push('ds-mg');
  if (design.space !== 100) classes.push('ds-sp');
  if (design.lineHeight > 0) classes.push('ds-lh');
  return classes.length ? ` ${classes.join(' ')}` : '';
}

/** Extra declarations to append to `sheetStyle()` — '' when there is nothing to apply. */
export function designStyle(design: Design): string {
  const parts: string[] = [];
  if (design.color) {
    parts.push(`--rs-accent:${design.color}`, `--rs-accent-hi:${accentHighlight(design.color)}`);
  }
  if (design.margin !== 100) parts.push(`--ds-mg:${design.margin / 100}`);
  if (design.space !== 100) parts.push(`--ds-sp:${design.space / 100}`);
  if (design.lineHeight > 0) parts.push(`--ds-lh:${design.lineHeight / 100}`);
  return parts.length ? `;${parts.join(';')}` : '';
}

/* --- Saved looks ("My templates") ----------------------------------------- */

export interface SavedLook {
  id: string;
  name: string;
  template: string;
  accent: string;
  font: string;
  design: Design;
}

export const MAX_LOOKS = 12;

export function normaliseLooks(raw: unknown): SavedLook[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedLook[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 40) : '';
    if (!name || typeof r.id !== 'string') continue;
    out.push({
      id: r.id.slice(0, 40),
      name,
      template: typeof r.template === 'string' ? r.template.slice(0, 40) : '',
      accent: typeof r.accent === 'string' ? r.accent.slice(0, 40) : '',
      font: typeof r.font === 'string' ? r.font.slice(0, 40) : '',
      design: normaliseDesign(r.design),
    });
    if (out.length >= MAX_LOOKS) break;
  }
  return out;
}

/* --- Storage (same pattern as typeface and size) -------------------------- */

const DESIGN_KEY = 'craftresume:design:v1';
const LOOKS_KEY = 'craftresume:looks:v1';

let current: Design | null = null;

export function getDesign(): Design {
  if (current) return current;
  try {
    const raw = localStorage.getItem(DESIGN_KEY);
    current = normaliseDesign(raw ? JSON.parse(raw) : null);
  } catch {
    current = { ...DEFAULT_DESIGN };
  }
  return current;
}

export function setDesign(next: Design): Design {
  current = normaliseDesign(next);
  try {
    if (isDefaultDesign(current)) localStorage.removeItem(DESIGN_KEY);
    else localStorage.setItem(DESIGN_KEY, JSON.stringify(current));
  } catch {
    /* Private mode or a full quota: the tweak still applies for this visit. */
  }
  return current;
}

export function loadLooks(): SavedLook[] {
  try {
    const raw = localStorage.getItem(LOOKS_KEY);
    return normaliseLooks(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

export function saveLooks(looks: SavedLook[]): void {
  try {
    localStorage.setItem(LOOKS_KEY, JSON.stringify(normaliseLooks(looks)));
  } catch {
    /* Ignore: the list simply will not persist. */
  }
}

/** What the editor appends to the sheet it paints — empty when nothing is tweaked. */
export function currentDesignClass(templateId: string): string {
  return designClass(getDesign(), templateId);
}

export function currentDesignStyle(): string {
  return designStyle(getDesign());
}

/**
 * Typeface and text size for the printed sheet.
 *
 * Both are applied as custom properties on the sheet itself — `--rs-font` and
 * `--rs-scale` — so one stylesheet still serves every template, and the live
 * preview and the printed PDF are typeset identically.
 */

export interface FontMeta {
  id: string;
  name: string;
  /** Short note on what the face is for, shown under the name in the menu. */
  note: string;
  /**
   * The stack written onto the sheet. Empty on `default`, which is the one
   * option that leaves each template with the face it was designed around.
   */
  stack: string;
  /** True when the face has to be fetched rather than found on the machine. */
  web?: boolean;
}

export const FONTS: FontMeta[] = [
  {
    id: 'default',
    name: 'Template default',
    note: 'Whatever this layout was designed with.',
    stack: '',
  },
  {
    id: 'inter',
    name: 'Inter',
    note: 'Modern sans. Dense and very legible small.',
    stack: '"Inter", ui-sans-serif, system-ui, sans-serif',
    web: true,
  },
  {
    id: 'lato',
    name: 'Lato',
    note: 'Warmer sans, a little narrower.',
    stack: '"Lato", "Inter", ui-sans-serif, system-ui, sans-serif',
    web: true,
  },
  {
    id: 'roboto',
    name: 'Roboto',
    note: 'Neutral sans. Fits more words per line.',
    stack: '"Roboto", "Inter", ui-sans-serif, system-ui, sans-serif',
    web: true,
  },
  {
    id: 'source-serif',
    name: 'Source Serif',
    note: 'Contemporary serif, still comfortable at 10pt.',
    stack: '"Source Serif 4", ui-serif, Georgia, serif',
    web: true,
  },
  {
    id: 'georgia',
    name: 'Georgia',
    note: 'Classic serif, on every machine already.',
    stack: 'Georgia, "Times New Roman", ui-serif, serif',
  },
  {
    id: 'arial',
    name: 'Arial',
    note: 'The safest sans for an automated screen.',
    stack: 'Arial, Helvetica, ui-sans-serif, sans-serif',
  },
  {
    id: 'times',
    name: 'Times New Roman',
    note: 'The safest serif for an automated screen.',
    stack: '"Times New Roman", Times, ui-serif, serif',
  },
];

export const DEFAULT_FONT = 'default';

export function resolveFont(value: string | null | undefined): FontMeta {
  return FONTS.find((font) => font.id === value) ?? FONTS[0];
}

/* ---------------------------------------------------------------------------
   Text size.

   A multiplier rather than a point value: every size on the sheet is written
   as `calc(<design size> * var(--rs-scale))`, so one number moves the whole
   page in proportion and no template loses its own typographic hierarchy.
--------------------------------------------------------------------------- */
export interface SizeMeta {
  id: string;
  name: string;
  scale: number;
}

export const FONT_SIZES: SizeMeta[] = [
  { id: 'xxs', name: 'Smallest', scale: 0.85 },
  { id: 'xs', name: 'Compact', scale: 0.9 },
  { id: 's', name: 'Small', scale: 0.95 },
  { id: 'm', name: 'Default', scale: 1 },
  { id: 'l', name: 'Large', scale: 1.06 },
  { id: 'xl', name: 'Larger', scale: 1.12 },
  { id: 'xxl', name: 'Largest', scale: 1.18 },
];

export const DEFAULT_FONT_SIZE = 'm';

const DEFAULT_SIZE_INDEX = FONT_SIZES.findIndex((size) => size.id === DEFAULT_FONT_SIZE);

export function resolveFontSize(value: string | null | undefined): SizeMeta {
  return FONT_SIZES.find((size) => size.id === value) ?? FONT_SIZES[DEFAULT_SIZE_INDEX];
}

/**
 * One step bigger or smaller, stopping at either end of the ladder rather than
 * wrapping around — pressing A+ once more at the top should do nothing, not
 * shrink the page back to its smallest.
 */
export function stepFontSize(value: string | null | undefined, delta: number): SizeMeta {
  const current = FONT_SIZES.indexOf(resolveFontSize(value));
  const next = Math.min(FONT_SIZES.length - 1, Math.max(0, current + delta));
  return FONT_SIZES[next];
}

/** True when there is no more room to grow (or shrink) in that direction. */
export function atSizeLimit(value: string | null | undefined, delta: number): boolean {
  return stepFontSize(value, delta).id === resolveFontSize(value).id;
}

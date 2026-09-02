/**
 * Cover letter formats.
 *
 * A letter is not a resume with fewer sections — it has one column, one voice
 * and about four hundred words, and what changes between formats is the
 * letterhead: how the sender is announced, where the inside address sits, and
 * whether the page carries any colour at all. So the letter keeps its own set
 * of layouts rather than borrowing the resume's seventeen, and it is chosen
 * the same way: browse the formats, pick one, then write.
 */

/** The four shelves the letter picker sorts formats onto. Order is display order. */
export const LETTER_CATEGORIES = ['Classic', 'Modern', 'Minimal', 'Bold'] as const;

export type LetterCategory = (typeof LETTER_CATEGORIES)[number];

export interface LetterMeta {
  id: string;
  name: string;
  tagline: string;
  /** Short note on when to reach for it — shown on the picker card. */
  bestFor: string;
  category: LetterCategory;
  /**
   * How safely the letterhead parses when the letter is pasted into an
   * application form or read by a machine. `strict` is one column with no
   * colour at all; `safe` adds a rule or a tint; `styled` leans on a filled
   * band or a panel.
   */
  ats: 'strict' | 'safe' | 'styled';
}

/* ---------------------------------------------------------------------------
   All eight are drawn from ordinary business-letter conventions — a ruled
   letterhead, a centred masthead, an indented serif page — so none of them
   reproduce a template from another builder, and all eight are free to use
   and download without attribution.
--------------------------------------------------------------------------- */
export const LETTERS: LetterMeta[] = [
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Ruled letterhead, block-left address, the standard business letter.',
    bestFor: 'Almost anything — the safe default',
    category: 'Classic',
    ats: 'safe',
  },
  {
    id: 'masthead',
    name: 'Masthead',
    tagline: 'Centred name and contact line over a hairline rule.',
    bestFor: 'Formal applications, public sector, law',
    category: 'Classic',
    ats: 'safe',
  },
  {
    id: 'statement',
    name: 'Statement',
    tagline: 'Large name on an accent underline, the role set as a tinted subject chip.',
    bestFor: 'Product, marketing, startups',
    category: 'Modern',
    ats: 'safe',
  },
  {
    id: 'rail',
    name: 'Rail',
    tagline: 'Contact details in a tinted column, the letter itself beside it.',
    bestFor: 'Design, communications, client-facing work',
    category: 'Modern',
    ats: 'styled',
  },
  {
    id: 'plain',
    name: 'Plain',
    tagline: 'No colour anywhere. Small name, wide margins, black text.',
    bestFor: 'Strict parsers, bulk applications, pasting into a form',
    category: 'Minimal',
    ats: 'strict',
  },
  {
    id: 'typeset',
    name: 'Typeset',
    tagline: 'Serif page with the sender block right-aligned and indented paragraphs.',
    bestFor: 'Academia, research, editorial',
    category: 'Minimal',
    ats: 'strict',
  },
  {
    id: 'banner',
    name: 'Banner',
    tagline: 'A solid accent band across the top with the name reversed out of it.',
    bestFor: 'Senior hires, business development, sales',
    category: 'Bold',
    ats: 'styled',
  },
  {
    id: 'monogram',
    name: 'Monogram',
    tagline: 'Initials in an accent disc beside the name and contact stack.',
    bestFor: 'Consulting, brand, creative technology',
    category: 'Bold',
    ats: 'styled',
  },
];

export const DEFAULT_LETTER = 'classic';

export function isLetterId(value: string | null | undefined): boolean {
  return !!value && LETTERS.some((letter) => letter.id === value);
}

export function resolveLetter(value: string | null | undefined): string {
  return isLetterId(value) ? (value as string) : DEFAULT_LETTER;
}

export function letterMeta(id: string): LetterMeta {
  return LETTERS.find((letter) => letter.id === id) ?? LETTERS[0];
}

/** Human label for the parsing rating, used on cards and in the editor menu. */
export const LETTER_ATS_LABEL: Record<LetterMeta['ats'], string> = {
  strict: 'Strict ATS',
  safe: 'ATS safe',
  styled: 'Design-led',
};

/** Formats grouped by category, in category order. Empty shelves are dropped. */
export function lettersByCategory(): { category: LetterCategory; items: LetterMeta[] }[] {
  return LETTER_CATEGORIES.map((category) => ({
    category,
    items: LETTERS.filter((letter) => letter.category === category),
  })).filter((group) => group.items.length > 0);
}

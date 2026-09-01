/** The six shelves the picker sorts layouts onto. Order is display order. */
export const TEMPLATE_CATEGORIES = [
  'ATS-Focused',
  'Modern',
  'Executive',
  'Academic',
  'Creative',
  'Professional',
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface TemplateMeta {
  id: string;
  name: string;
  tagline: string;
  /** Short note on who the layout suits — shown on the picker card. */
  bestFor: string;
  layout: 'single' | 'sidebar' | 'split';
  category: TemplateCategory;
  /**
   * How safely the layout parses in a strict applicant tracking system.
   * `strict` is single-column and ruled, with no panels — the safe default
   * when the posting goes through an automated screen. `safe` keeps one
   * reading order but adds a rail or a tint. `styled` leans on colour.
   */
  ats: 'strict' | 'safe' | 'styled';
}

/* ---------------------------------------------------------------------------
   Every layout here is drawn from scratch for CraftResume out of ordinary
   resume conventions — ruled headings, a colour rail, a two-column split.
   None of them reproduce a proprietary template from another builder, so all
   twelve are free to use, edit and download without attribution.
--------------------------------------------------------------------------- */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'ledger',
    name: 'Ledger',
    tagline: 'One column, ruled sections, nothing between you and the parser.',
    bestFor: 'Finance, law, consulting',
    layout: 'single',
    category: 'ATS-Focused',
    ats: 'strict',
  },
  {
    id: 'beacon',
    name: 'Beacon',
    tagline: 'The plainest sheet here. Black text, ruled headings, no panels.',
    bestFor: 'Strict parsers, government, bulk applications',
    layout: 'single',
    category: 'ATS-Focused',
    ats: 'strict',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    tagline: 'Full-height colour rail carrying the scannable facts.',
    bestFor: 'Engineering, data, IT',
    layout: 'sidebar',
    category: 'Modern',
    ats: 'safe',
  },
  {
    id: 'cascade',
    name: 'Cascade',
    tagline: 'A timeline spine threading every role and qualification.',
    bestFor: 'Software, DevOps, technical programme management',
    layout: 'single',
    category: 'Modern',
    ats: 'safe',
  },
  {
    id: 'meridian',
    name: 'Meridian',
    tagline: 'Centred masthead over a competency band and a plain record.',
    bestFor: 'Director, VP, senior management',
    layout: 'single',
    category: 'Executive',
    ats: 'strict',
  },
  {
    id: 'summit',
    name: 'Summit',
    tagline: 'Story on the left, a tinted evidence rail down the right.',
    bestFor: 'General management, operations, sales leadership',
    layout: 'sidebar',
    category: 'Executive',
    ats: 'safe',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    tagline: 'Serif CV with education first and numbered publications.',
    bestFor: 'Research, academia, higher education',
    layout: 'single',
    category: 'Academic',
    ats: 'safe',
  },
  {
    id: 'helix',
    name: 'Helix',
    tagline: 'Licences and credentials up top, clinical record underneath.',
    bestFor: 'Healthcare, life sciences, regulated roles',
    layout: 'single',
    category: 'Academic',
    ats: 'safe',
  },
  {
    id: 'vertex',
    name: 'Vertex',
    tagline: 'Colour masthead, monogram, two columns underneath.',
    bestFor: 'Design, marketing, product',
    layout: 'split',
    category: 'Creative',
    ats: 'styled',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    tagline: 'Monogram band, chip-led contact strip, portfolio-first columns.',
    bestFor: 'Brand, content, creative technology',
    layout: 'split',
    category: 'Creative',
    ats: 'styled',
  },
  {
    id: 'lattice',
    name: 'Lattice',
    tagline: 'Slim header rule, then two even columns of dense record.',
    bestFor: 'Project management, supply chain, HR',
    layout: 'split',
    category: 'Professional',
    ats: 'safe',
  },
  {
    id: 'harbor',
    name: 'Harbor',
    tagline: 'Softly tinted rail beside a conventional corporate record.',
    bestFor: 'Business analysis, customer success, operations',
    layout: 'sidebar',
    category: 'Professional',
    ats: 'safe',
  },
];

export const DEFAULT_TEMPLATE = 'atlas';

export function isTemplateId(value: string | null | undefined): boolean {
  return !!value && TEMPLATES.some((t) => t.id === value);
}

export function resolveTemplate(value: string | null | undefined): string {
  return isTemplateId(value) ? (value as string) : DEFAULT_TEMPLATE;
}

export function templateMeta(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** Human label for the ATS rating, used on cards and in the editor menu. */
export const ATS_LABEL: Record<TemplateMeta['ats'], string> = {
  strict: 'Strict ATS',
  safe: 'ATS safe',
  styled: 'Design-led',
};

/** Templates grouped by category, in category order. Empty shelves are dropped. */
export function templatesByCategory(): { category: TemplateCategory; items: TemplateMeta[] }[] {
  return TEMPLATE_CATEGORIES.map((category) => ({
    category,
    items: TEMPLATES.filter((t) => t.category === category),
  })).filter((group) => group.items.length > 0);
}

/* ---------------------------------------------------------------------------
   Print accent colours.

   `hex` drives headings, rules and any filled panel. `hi` is the one brighter
   companion a template is allowed to reach for (Vertex's monogram disc), kept
   explicit rather than derived so it prints as an exact ink, not a guess.
--------------------------------------------------------------------------- */
export interface AccentMeta {
  id: string;
  name: string;
  hex: string;
  hi: string;
}

export const ACCENTS: AccentMeta[] = [
  { id: 'navy', name: 'Navy', hex: '#1e3a5f', hi: '#2ec4b6' },
  { id: 'graphite', name: 'Graphite', hex: '#2f3336', hi: '#8fb0a9' },
  { id: 'forest', name: 'Forest', hex: '#1f5135', hi: '#7fbf6a' },
  { id: 'maroon', name: 'Maroon', hex: '#7c1d33', hi: '#e0917c' },
  { id: 'steel', name: 'Steel', hex: '#44688c', hi: '#6fd0d8' },
  { id: 'clay', name: 'Clay', hex: '#bd5a33', hi: '#f0b45e' },
  { id: 'teal', name: 'Teal', hex: '#12595f', hi: '#5fcfae' },
  { id: 'plum', name: 'Plum', hex: '#5b3a6e', hi: '#c79ae0' },
  { id: 'slate', name: 'Slate', hex: '#59616b', hi: '#9fc3d6' },
  { id: 'olive', name: 'Olive', hex: '#5c6f2c', hi: '#c3d271' },
  { id: 'rust', name: 'Rust', hex: '#9c4d1c', hi: '#eaa05b' },
  { id: 'midnight', name: 'Midnight', hex: '#152744', hi: '#6f9fd8' },
  { id: 'emerald', name: 'Emerald', hex: '#12784f', hi: '#71d9a4' },
  { id: 'lagoon', name: 'Lagoon', hex: '#0d8b9c', hi: '#8fe3dd' },
  { id: 'indigo', name: 'Indigo', hex: '#4a52d0', hi: '#a3aef5' },
  { id: 'crimson', name: 'Crimson', hex: '#b02722', hi: '#f0a087' },
  { id: 'amber', name: 'Amber', hex: '#96650a', hi: '#f2cd76' },
];

export const DEFAULT_ACCENT = 'navy';

export function resolveAccent(value: string | null | undefined): AccentMeta {
  return ACCENTS.find((a) => a.id === value) ?? ACCENTS.find((a) => a.id === DEFAULT_ACCENT)!;
}

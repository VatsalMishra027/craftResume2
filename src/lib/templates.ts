export interface TemplateMeta {
  id: string;
  name: string;
  tagline: string;
  /** Short note on who the layout suits — shown on the picker card. */
  bestFor: string;
  layout: 'single' | 'sidebar';
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'onyx',
    name: 'Onyx',
    tagline: 'Single column, quietly formal.',
    bestFor: 'Finance, law, consulting',
    layout: 'single',
  },
  {
    id: 'meridian',
    name: 'Meridian',
    tagline: 'Contact and skills on a calm left rail.',
    bestFor: 'Design, marketing, product',
    layout: 'sidebar',
  },
  {
    id: 'quill',
    name: 'Quill',
    tagline: 'Editorial serif with generous air.',
    bestFor: 'Writing, research, academia',
    layout: 'single',
  },
  {
    id: 'grid',
    name: 'Grid',
    tagline: 'Compact labels, dense and technical.',
    bestFor: 'Engineering, data, IT',
    layout: 'single',
  },
];

export const DEFAULT_TEMPLATE = 'onyx';

export function isTemplateId(value: string | null | undefined): boolean {
  return !!value && TEMPLATES.some((t) => t.id === value);
}

export function resolveTemplate(value: string | null | undefined): string {
  return isTemplateId(value) ? (value as string) : DEFAULT_TEMPLATE;
}

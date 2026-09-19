import type {
  CertificationItem,
  CoverLetter,
  CustomSection,
  CustomSectionItem,
  EducationItem,
  ExperienceItem,
  InterestItem,
  LanguageItem,
  ProjectItem,
  PublicationItem,
  ResumeData,
  SectionKey,
  SectionMeta,
  SkillItem,
} from './types';
import { SECTION_KEYS } from './types';
import { EMPTY_COVER_LETTER, EMPTY_RESUME, SAMPLE_RESUME } from './sample';
import { DEFAULT_ACCENT, DEFAULT_TEMPLATE, resolveAccent, resolveTemplate } from './templates';
import { DEFAULT_LETTER, resolveLetter } from './letters';
import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  resolveFont,
  resolveFontSize,
} from './fonts';

const DATA_KEY = 'craftresume:data:v2';
const LEGACY_DATA_KEY = 'craftresume:data:v1';
const TEMPLATE_KEY = 'craftresume:template:v1';
const LETTER_KEY = 'craftresume:letter:v1';
const ACCENT_KEY = 'craftresume:accent:v1';
const SPLIT_KEY = 'craftresume:split:v1';
const THEME_KEY = 'craftresume:theme:v1';
const FONT_KEY = 'craftresume:font:v1';
const FONT_SIZE_KEY = 'craftresume:fontsize:v1';

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Skill meters are 1–5; anything else lands on a full bar rather than a blank one. */
function level(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * v1 stored skills as one comma-separated string. Split it back into items so
 * an existing draft survives the upgrade instead of losing its skills list.
 */
function migrateSkills(value: unknown): SkillItem[] {
  if (typeof value !== 'string') return [];
  return value
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ id: uid('skl'), name, level: 5 }));
}

/**
 * Renamed and removed headings. Sections the user has left alone are dropped
 * so an untouched resume stores nothing here at all.
 */
function sectionMeta(raw: unknown): ResumeData['sections'] {
  if (!isRecord(raw)) return undefined;

  const out: Record<string, SectionMeta> = {};
  for (const [key, entry] of Object.entries(raw)) {
    if (!isRecord(entry)) continue;
    const label = str(entry.label).trim();
    const hidden = entry.hidden === true;
    if (!label && !hidden) continue;
    out[key] = { ...(label ? { label } : {}), ...(hidden ? { hidden: true } : {}) };
  }

  return Object.keys(out).length ? out : undefined;
}

/**
 * The order the user arranged the sections into. Stored as a complete list, so
 * a key added to the app in a later release still has somewhere to go: unknown
 * names are dropped and anything the stored list never mentioned keeps its
 * default place at the end. An order matching the default is not worth storing.
 */
function sectionOrder(raw: unknown, customSectionIds: string[] = []): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const validKeys = new Set<string>([...SECTION_KEYS, ...customSectionIds]);
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    if (validKeys.has(entry)) seen.add(entry);
  }
  if (!seen.size) return undefined;

  const out = [
    ...seen,
    ...SECTION_KEYS.filter((key) => !seen.has(key)),
    ...customSectionIds.filter((id) => !seen.has(id)),
  ];
  return out.every((key, i) => key === SECTION_KEYS[i]) && out.length === SECTION_KEYS.length
    ? undefined
    : out;
}

/**
 * A headshot, if what is stored is one. Only a data: URL survives — a resume
 * restored from storage must not be able to make the page fetch a remote
 * image, and the upload path never produces anything else.
 */
function photo(value: unknown): string {
  const raw = str(value).trim();
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(raw) ? raw : '';
}

/** The cover letter, filled out to a complete shape from whatever is stored. */
function coverLetter(raw: unknown): CoverLetter {
  const c = isRecord(raw) ? raw : {};
  return {
    recipient: str(c.recipient),
    recipientTitle: str(c.recipientTitle),
    company: str(c.company),
    companyAddress: str(c.companyAddress),
    role: str(c.role),
    date: str(c.date),
    greeting: str(c.greeting),
    body: str(c.body),
    signOff: str(c.signOff),
  };
}

/**
 * Rebuilds a known-good shape from whatever is in storage. Anything missing or
 * of the wrong type falls back to empty rather than throwing at render time.
 */
export function normalise(raw: unknown): ResumeData {
  if (!isRecord(raw)) return structuredClone(SAMPLE_RESUME);

  const basics = isRecord(raw.basics) ? raw.basics : {};

  return {
    basics: {
      fullName: str(basics.fullName),
      title: str(basics.title),
      email: str(basics.email),
      phone: str(basics.phone),
      location: str(basics.location),
      website: str(basics.website),
      linkedin: str(basics.linkedin),
      github: str(basics.github),
      summary: str(basics.summary),
      photo: photo(basics.photo),
    },
    experience: arr(raw.experience).map((item): ExperienceItem => {
      const e = isRecord(item) ? item : {};
      return {
        id: str(e.id) || uid('exp'),
        role: str(e.role),
        company: str(e.company),
        location: str(e.location),
        start: str(e.start),
        end: str(e.end),
        bullets: str(e.bullets),
      };
    }),
    education: arr(raw.education).map((item): EducationItem => {
      const e = isRecord(item) ? item : {};
      return {
        id: str(e.id) || uid('edu'),
        degree: str(e.degree),
        school: str(e.school),
        location: str(e.location),
        start: str(e.start),
        end: str(e.end),
        note: str(e.note),
      };
    }),
    projects: arr(raw.projects).map((item): ProjectItem => {
      const p = isRecord(item) ? item : {};
      return {
        id: str(p.id) || uid('prj'),
        name: str(p.name),
        link: str(p.link),
        description: str(p.description),
        tech: str(p.tech),
      };
    }),
    skills: Array.isArray(raw.skills)
      ? raw.skills.map((item): SkillItem => {
          const s = isRecord(item) ? item : {};
          return { id: str(s.id) || uid('skl'), name: str(s.name), level: level(s.level) };
        })
      : migrateSkills(raw.skills),
    languages: arr(raw.languages).map((item): LanguageItem => {
      const l = isRecord(item) ? item : {};
      return { id: str(l.id) || uid('lng'), name: str(l.name), level: str(l.level) };
    }),
    certifications: arr(raw.certifications).map((item): CertificationItem => {
      const c = isRecord(item) ? item : {};
      return {
        id: str(c.id) || uid('crt'),
        name: str(c.name),
        issuer: str(c.issuer),
        date: str(c.date),
      };
    }),
    publications: arr(raw.publications).map((item): PublicationItem => {
      const p = isRecord(item) ? item : {};
      return { id: str(p.id) || uid('pub'), title: str(p.title), meta: str(p.meta) };
    }),
    interests: arr(raw.interests).map((item): InterestItem => {
      const i = isRecord(item) ? item : {};
      return { id: str(i.id) || uid('int'), name: str(i.name) };
    }),
    customSections: arr(raw.customSections).map((item): CustomSection => {
      const c = isRecord(item) ? item : {};
      const items = arr(c.items).map((it): CustomSectionItem => {
        const i = isRecord(it) ? it : {};
        return {
          id: str(i.id) || uid('cit'),
          text: str(i.text),
          name: str(i.name),
          detail: str(i.detail),
          date: str(i.date),
          url: str(i.url),
        };
      });
      return {
        id: str(c.id) || uid('csec'),
        title: str(c.title) || 'Custom Section',
        type: 'custom',
        items,
        description: str(c.description),
        bullets: arr(c.bullets).map(str),
        hidden: c.hidden === true,
      };
    }),
    coverLetter: coverLetter(raw.coverLetter),
    sections: sectionMeta(raw.sections),
    order: sectionOrder(
      raw.order,
      arr(raw.customSections)
        .map((c) => (isRecord(c) ? str(c.id) : ''))
        .filter(Boolean),
    ),
  };
}

export function loadResume(): ResumeData {
  try {
    const raw = localStorage.getItem(DATA_KEY) ?? localStorage.getItem(LEGACY_DATA_KEY);
    if (!raw) return structuredClone(SAMPLE_RESUME);
    return normalise(JSON.parse(raw));
  } catch {
    return structuredClone(SAMPLE_RESUME);
  }
}

/**
 * True when this browser is already holding a draft. Loading a role blueprint
 * overwrites everything, so the editor asks first when there is work to lose.
 */
export function hasSavedResume(): boolean {
  try {
    return (
      localStorage.getItem(DATA_KEY) !== null || localStorage.getItem(LEGACY_DATA_KEY) !== null
    );
  } catch {
    return false;
  }
}

/**
 * What a save did. A headshot is by far the biggest thing in the draft, so it
 * is the one field that can push a resume past the browser's storage quota —
 * when that happens the words are kept and the picture is dropped, and the
 * editor says so rather than silently losing the last hour of typing.
 */
export type SaveResult = 'saved' | 'saved-without-photo' | 'failed';

export function saveResume(data: ResumeData): SaveResult {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return 'saved';
  } catch {
    // Fall through and try again without the picture.
  }

  if (!data.basics.photo) return 'failed';

  try {
    const lean: ResumeData = { ...data, basics: { ...data.basics, photo: '' } };
    localStorage.setItem(DATA_KEY, JSON.stringify(lean));
    return 'saved-without-photo';
  } catch {
    // Private-browsing quota errors must not break editing.
    return 'failed';
  }
}

export function loadTemplate(): string {
  try {
    return resolveTemplate(localStorage.getItem(TEMPLATE_KEY));
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

export function saveTemplate(id: string): void {
  try {
    localStorage.setItem(TEMPLATE_KEY, resolveTemplate(id));
  } catch {
    // Ignore — the template still applies for this session.
  }
}

/* ---------------------------------------------------------------------------
   The cover letter's format.

   Stored apart from the resume's template on purpose: the two documents are
   picked in two different galleries at two different moments, and a letter
   layout is not a resume layout with fewer sections. They still share the
   accent and the typeface, which is what makes them look like one application.
--------------------------------------------------------------------------- */
export function loadLetter(): string {
  try {
    return resolveLetter(localStorage.getItem(LETTER_KEY));
  } catch {
    return DEFAULT_LETTER;
  }
}

export function saveLetter(id: string): void {
  try {
    localStorage.setItem(LETTER_KEY, resolveLetter(id));
  } catch {
    // Ignore — the format still applies for this session.
  }
}

/** True when this browser has picked a letter format before. */
export function hasChosenLetter(): boolean {
  try {
    return localStorage.getItem(LETTER_KEY) !== null;
  } catch {
    return false;
  }
}

export function loadAccent(): string {
  try {
    return resolveAccent(localStorage.getItem(ACCENT_KEY)).id;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function saveAccent(id: string): void {
  try {
    localStorage.setItem(ACCENT_KEY, resolveAccent(id).id);
  } catch {
    // Ignore.
  }
}

/** Editor form-pane width, in rem. Clamped so neither pane can be squeezed shut. */
export const SPLIT_MIN = 20;
export const SPLIT_MAX = 46;
export const SPLIT_DEFAULT = 27;

export function clampSplit(value: number): number {
  if (!Number.isFinite(value)) return SPLIT_DEFAULT;
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(value * 10) / 10));
}

export function loadSplit(): number {
  try {
    const raw = localStorage.getItem(SPLIT_KEY);
    return raw === null ? SPLIT_DEFAULT : clampSplit(Number(raw));
  } catch {
    return SPLIT_DEFAULT;
  }
}

export function saveSplit(value: number): void {
  try {
    localStorage.setItem(SPLIT_KEY, String(clampSplit(value)));
  } catch {
    // Ignore.
  }
}

/* ---------------------------------------------------------------------------
   Light / dark.

   Two states and no third one: the app is either light or dark, and whichever
   it is, it is a choice this browser has stored. A first visit takes its
   opening guess from the operating system, then that guess is written down —
   from that point on the OS flipping at sunset never moves the page under
   someone who has already decided.
--------------------------------------------------------------------------- */
export type Theme = 'light' | 'dark';

export function resolveTheme(value: string | null | undefined): Theme {
  return value === 'dark' ? 'dark' : 'light';
}

/** The stored choice, or null when this browser has never made one. */
export function storedTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw === 'dark' || raw === 'light' ? raw : null;
  } catch {
    return null;
  }
}

/** What the OS would prefer, for the one visit before a choice exists. */
export function systemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function loadTheme(): Theme {
  return storedTheme() ?? systemTheme();
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, resolveTheme(theme));
  } catch {
    // Ignore — the choice still applies for this session.
  }
}

/* ---------------------------------------------------------------------------
   Sheet typography. Shared by both editors on purpose: a resume and its cover
   letter that arrive in two different typefaces read as two applications.
--------------------------------------------------------------------------- */
export function loadFont(): string {
  try {
    return resolveFont(localStorage.getItem(FONT_KEY)).id;
  } catch {
    return DEFAULT_FONT;
  }
}

export function saveFont(id: string): void {
  try {
    localStorage.setItem(FONT_KEY, resolveFont(id).id);
  } catch {
    // Ignore.
  }
}

export function loadFontSize(): string {
  try {
    return resolveFontSize(localStorage.getItem(FONT_SIZE_KEY)).id;
  } catch {
    return DEFAULT_FONT_SIZE;
  }
}

export function saveFontSize(id: string): void {
  try {
    localStorage.setItem(FONT_SIZE_KEY, resolveFontSize(id).id);
  } catch {
    // Ignore.
  }
}

export { THEME_KEY, FONT_KEY, FONT_SIZE_KEY };

export function clearAll(): ResumeData {
  try {
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(LEGACY_DATA_KEY);
  } catch {
    // Ignore.
  }
  return structuredClone(EMPTY_RESUME);
}

export { EMPTY_COVER_LETTER, EMPTY_RESUME, SAMPLE_RESUME };

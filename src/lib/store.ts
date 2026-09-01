import type { EducationItem, ExperienceItem, ProjectItem, ResumeData } from './types';
import { EMPTY_RESUME, SAMPLE_RESUME } from './sample';
import { DEFAULT_TEMPLATE, resolveTemplate } from './templates';

const DATA_KEY = 'craftresume:data:v1';
const TEMPLATE_KEY = 'craftresume:template:v1';

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Rebuilds a known-good shape from whatever is in storage. Anything missing or
 * of the wrong type falls back to empty rather than throwing at render time.
 */
function normalise(raw: unknown): ResumeData {
  if (!isRecord(raw)) return structuredClone(SAMPLE_RESUME);

  const basics = isRecord(raw.basics) ? raw.basics : {};
  const arr = (value: unknown) => (Array.isArray(value) ? value : []);

  return {
    basics: {
      fullName: str(basics.fullName),
      title: str(basics.title),
      email: str(basics.email),
      phone: str(basics.phone),
      location: str(basics.location),
      website: str(basics.website),
      linkedin: str(basics.linkedin),
      summary: str(basics.summary),
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
      };
    }),
    skills: str(raw.skills),
  };
}

export function loadResume(): ResumeData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return structuredClone(SAMPLE_RESUME);
    return normalise(JSON.parse(raw));
  } catch {
    return structuredClone(SAMPLE_RESUME);
  }
}

export function saveResume(data: ResumeData): void {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    // Private-browsing quota errors must not break editing.
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

export function clearAll(): ResumeData {
  try {
    localStorage.removeItem(DATA_KEY);
  } catch {
    // Ignore.
  }
  return structuredClone(EMPTY_RESUME);
}

export { EMPTY_RESUME, SAMPLE_RESUME };

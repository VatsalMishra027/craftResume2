export interface Basics {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  summary: string;
  /**
   * A data: URL for the headshot, read straight off the user's disk and never
   * uploaded. Only the photo templates draw it; the rest ignore it entirely,
   * so a picture on file never leaks onto a strict-ATS layout.
   */
  photo?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  /** One achievement per line. Stored raw so the textarea round-trips cleanly. */
  bullets: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  location: string;
  start: string;
  end: string;
  note: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  link: string;
  description: string;
  /** Comma separated stack tags, shown as chips where the template has room. */
  tech: string;
}

export interface SkillItem {
  id: string;
  name: string;
  /** 1–5. Templates that draw meters read this; the plain ones ignore it. */
  level: number;
}

export interface LanguageItem {
  id: string;
  name: string;
  /** Free text so "Professional Working (B2)" survives verbatim. */
  level: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface PublicationItem {
  id: string;
  title: string;
  meta: string;
}

export interface InterestItem {
  id: string;
  name: string;
}

/**
 * What the user has done to one section's heading. Absent means the template
 * decides, which is the default for every section on a fresh resume.
 */
export interface SectionMeta {
  /** Replaces the heading the template would have printed. */
  label?: string;
  /** Kept in the editor, left off the printed sheet. */
  hidden?: boolean;
}

/**
 * The cover letter that travels with the resume. It reuses the resume's own
 * contact block and template, so the two documents arrive looking like one
 * application rather than two unrelated files.
 */
export interface CoverLetter {
  /** Who it is addressed to — "Hiring Manager" when the name is unknown. */
  recipient: string;
  recipientTitle: string;
  company: string;
  companyAddress: string;
  /** The role being applied for, printed as the subject line. */
  role: string;
  /** Free text so "12 March 2026" and "2026-03-12" both survive verbatim. */
  date: string;
  greeting: string;
  /** One paragraph per blank-line-separated block. */
  body: string;
  signOff: string;
}

export interface ResumeData {
  basics: Basics;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: SkillItem[];
  languages: LanguageItem[];
  certifications: CertificationItem[];
  publications: PublicationItem[];
  interests: InterestItem[];
  /** Absent until the user opens the cover letter for the first time. */
  coverLetter?: CoverLetter;
  /** Renamed or removed headings. Only holds the sections the user has touched. */
  sections?: Partial<Record<SectionKey, SectionMeta>>;
  /**
   * The order the user has arranged the sections into, as a complete list.
   * Absent means every template keeps the order it was designed around.
   */
  order?: SectionKey[];
}

/** Every repeatable list. `basics` is the one singleton and is handled apart.
    Order is the order the editor's rail lists them in. */
export const SECTION_KEYS = [
  'experience',
  'education',
  'skills',
  'languages',
  'projects',
  'certifications',
  'publications',
  'interests',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

/** What the resume editor's left rail lists: the singleton plus every list. */
export type PanelKey = 'basics' | SectionKey;

/**
 * What the cover letter editor's rail lists. The letter is one document with
 * no repeatable sections, so its rail is the three parts of a letter — who it
 * is from, who it is to, and what it says — rather than a list of sections.
 */
export type CoverPanelKey = 'sender' | 'recipient' | 'letter';

export type AnyItem =
  | ExperienceItem
  | EducationItem
  | ProjectItem
  | SkillItem
  | LanguageItem
  | CertificationItem
  | PublicationItem
  | InterestItem;

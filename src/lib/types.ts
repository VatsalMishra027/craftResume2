export interface Basics {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  summary: string;
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
}

export interface ResumeData {
  basics: Basics;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  /** Comma separated; split at render time. */
  skills: string;
}

export type SectionKey = 'experience' | 'education' | 'projects';

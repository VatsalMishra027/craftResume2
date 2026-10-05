import type { CoverLetter, ResumeData } from './types';
import { templateUsesPhoto } from './templates';
import { SAMPLE_PORTRAIT } from './sample-photo';

/** A blank letter, carrying the two lines almost every letter opens and closes on. */
export const EMPTY_COVER_LETTER: CoverLetter = {
  recipient: '',
  recipientTitle: '',
  company: '',
  companyAddress: '',
  role: '',
  date: '',
  greeting: 'Dear Hiring Manager,',
  body: '',
  signOff: 'Sincerely,',
};

/**
 * The letter the sample resume arrives with. Short on purpose — three
 * paragraphs is the length a hiring manager actually reads.
 */
export const SAMPLE_COVER_LETTER: CoverLetter = {
  recipient: 'Hiring Manager',
  recipientTitle: '',
  company: 'Northwind Systems',
  companyAddress: 'London, UK',
  role: 'Senior Product Designer',
  date: '',
  greeting: 'Dear Hiring Manager,',
  body: "I am writing about the Senior Product Designer role. I have spent seven years on B2B software, most recently owning onboarding and the design system at Northwind Systems, and your posting describes the part of the work I like most: dense interfaces that have to stay legible under real data.\n\nTwo things I would bring on day one. I rebuilt an onboarding flow that took activation from 34% to 61% in two quarters, and I established a design system that four product teams and thirty engineers now build against without asking a designer first. Both were as much about writing things down and holding a cadence as about the interface itself.\n\nI would welcome the chance to talk about what the first ninety days would look like. Thank you for your time and for reading this far.",
  signOff: 'Sincerely,',
};

/**
 * Prefilled content so a new editor never opens on an empty page.
 *
 * Enough of a record to show what a finished resume looks like — three roles
 * with real numbers in the bullets, a qualification, a project, skills,
 * languages and a certification — and no more than that. Every one of the
 * seventeen layouts has to hold this on a single A4 sheet, which is the
 * constraint that decides what goes in: a sample that spills onto a second
 * page teaches the wrong lesson about how long a resume should be, and it
 * means the first thing a new user does is delete things.
 *
 * The measured tightest layouts are Anchor, Scholar and Beacon; check those
 * before adding anything here.
 */
export const SAMPLE_RESUME: ResumeData = {
  basics: {
    fullName: 'Alex Martin',
    title: 'Senior Product Designer',
    email: 'alex.martin@email.com',
    phone: '+44 20 7946 0958',
    location: 'London, UK',
    website: 'alexmartin.design',
    linkedin: 'linkedin.com/in/alexmartin',
    github: '',
    summary:
      'Product designer with 7 years on B2B software, from research through shipped interface. I care about information density, empty states and the seams between teams.',
  },
  experience: [
    {
      id: 'exp-1',
      role: 'Senior Product Designer',
      company: 'Northwind Systems',
      location: 'London',
      start: '2022',
      end: 'Present',
      bullets:
        'Rebuilt onboarding, lifting activation from 34% to 61% in two quarters.\nEstablished the design system now used by 4 product teams and 30+ engineers.\nRan the research cadence that removed two planned features from the roadmap.',
    },
    {
      id: 'exp-2',
      role: 'Product Designer',
      company: 'Halcyon Labs',
      location: 'Remote',
      start: '2019',
      end: '2022',
      bullets:
        'Owned the analytics dashboard used daily by 12,000 customers.\nCut billing support tickets by 41% after rewriting the pricing page.',
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'B.Des, Interaction Design',
      school: 'Westbrook University',
      location: 'London',
      start: '2015',
      end: '2019',
      note: 'Graduated with distinction. Thesis on interfaces for dense operational data.',
    },
  ],
  projects: [
    {
      id: 'prj-1',
      name: 'Fieldnote',
      link: 'fieldnote.app',
      description: 'An offline-first research notebook for field interviews. 4,000 monthly users.',
      tech: 'Figma, React, IndexedDB',
    },
  ],
  skills: [
    { id: 'skl-1', name: 'Product strategy', level: 5 },
    { id: 'skl-2', name: 'User research', level: 5 },
    { id: 'skl-3', name: 'Design systems', level: 5 },
    { id: 'skl-4', name: 'Prototyping', level: 4 },
    { id: 'skl-5', name: 'Figma', level: 5 },
    { id: 'skl-6', name: 'Accessibility (WCAG)', level: 4 },
  ],
  languages: [
    { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
    { id: 'lng-2', name: 'Spanish', level: 'Native / Bilingual' },
  ],
  certifications: [
    {
      id: 'crt-1',
      name: 'NN/g UX Certification',
      issuer: 'Nielsen Norman Group',
      date: '2023',
    },
  ],
  /**
   * Left empty on purpose. Publications is the one section on this list that
   * most people genuinely do not have, and it is worth about a tenth of a page
   * on a single-column layout — which is the difference between the sample
   * arriving as one sheet and arriving as two.
   */
  publications: [],
  interests: [
    { id: 'int-1', name: 'Typography' },
    { id: 'int-2', name: 'Long-distance cycling' },
    { id: 'int-3', name: 'Letterpress printing' },
  ],
  coverLetter: SAMPLE_COVER_LETTER,
};

/**
 * The same record under a different name, for the layouts that carry a
 * headshot. The photo gallery cards and a fresh photo-layout editor open on
 * this one, so a stand-in portrait and the name beside it agree.
 */
export const SAMPLE_RESUME_PHOTO: ResumeData = {
  ...SAMPLE_RESUME,
  basics: {
    ...SAMPLE_RESUME.basics,
    fullName: 'Sofia Martin',
    email: 'sofia.martin@email.com',
    website: 'sofiamartin.design',
    linkedin: 'linkedin.com/in/sofiamartin',
    photo: SAMPLE_PORTRAIT,
  },
};

/**
 * How much extra record each layout gets on top of the base sample.
 *
 * The base sample is sized for the tightest layouts (Anchor, Scholar, Beacon),
 * which leaves the roomier ones — a wide rail, a card grid, a generous header —
 * looking half empty on a gallery card. Each layout is given the highest
 * `enrich` level (see below) that still lands on one A4 sheet, measured in the
 * browser; layouts missing from the table already fill the page.
 */
const FILL_LEVEL: Record<string, number> = {
  ledger: 2,
  cascade: 2,
  atlas: 4,
  summit: 4,
  vertex: 2,
  pulse: 3,
  lattice: 6,
  harbor: 3,
  aperture: 1,
  cameo: 5,
  orbit: 3,
  prism: 3,
};

/**
 * Adds record to the base sample one step at a time, so each layout can be
 * given the most its single A4 sheet will hold.
 *   1 three more skills        2 a fourth bullet on the latest role
 *   3 a third role             4 a second project and certification
 *   5 a second qualification, a language and an interest
 *   6 two publications
 */
export function enrich(base: ResumeData, level: number): ResumeData {
  const d = structuredClone(base);
  if (level >= 1) {
    d.skills.push(
      { id: 'skl-7', name: 'Information architecture', level: 4 },
      { id: 'skl-8', name: 'Usability testing', level: 5 },
      { id: 'skl-9', name: 'Workshop facilitation', level: 4 },
    );
  }
  if (level >= 2) {
    d.experience[0].bullets +=
      '\nMentored three designers into senior roles and ran the quarterly design critique.';
  }
  if (level >= 3) {
    d.experience.push({
      id: 'exp-3',
      role: 'UX Designer',
      company: 'Brightside Agency',
      location: 'London',
      start: '2017',
      end: '2019',
      bullets:
        'Designed web and mobile products for 14 clients across retail and fintech.\nRan weekly usability sessions that shaped three successful launches.',
    });
  }
  if (level >= 4) {
    d.projects.push({
      id: 'prj-2',
      name: 'Palette Check',
      link: 'palettecheck.dev',
      description: 'A free colour-contrast checker used by 9,000 designers a month.',
      tech: 'TypeScript, Astro',
    });
    d.certifications.push({
      id: 'crt-2',
      name: 'Certified Scrum Product Owner',
      issuer: 'Scrum Alliance',
      date: '2021',
    });
  }
  if (level >= 5) {
    d.education.push({
      id: 'edu-2',
      degree: 'Diploma, Art and Design',
      school: 'Westbrook College',
      location: 'London',
      start: '2013',
      end: '2015',
      note: '',
    });
    d.languages.push({ id: 'lng-3', name: 'French', level: 'Conversational (B1)' });
    d.interests.push({ id: 'int-4', name: 'Sketching' });
  }
  if (level >= 6) {
    d.publications = [
      { id: 'pub-1', title: 'Designing for dense data', meta: 'Smashing Magazine, 2023' },
      { id: 'pub-2', title: 'Empty states that teach', meta: 'UX Collective, 2022' },
    ];
  }
  return d;
}

const sampleCache = new Map<string, ResumeData>();

/**
 * The sample that belongs with a layout: Sofia on photo layouts, Alex elsewhere,
 * with as much extra record as that layout has room for.
 */
export function sampleFor(templateId: string): ResumeData {
  const hit = sampleCache.get(templateId);
  if (hit) return hit;
  const base = templateUsesPhoto(templateId) ? SAMPLE_RESUME_PHOTO : SAMPLE_RESUME;
  const level = FILL_LEVEL[templateId];
  const out = level ? enrich(base, level) : base;
  sampleCache.set(templateId, out);
  return out;
}

/** Shape used when someone clears everything out and starts clean. */
export const EMPTY_RESUME: ResumeData = {
  basics: {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    summary: '',
    photo: '',
  },
  experience: [],
  education: [],
  projects: [],
  skills: [],
  languages: [],
  certifications: [],
  publications: [],
  interests: [],
  coverLetter: { ...EMPTY_COVER_LETTER },
};

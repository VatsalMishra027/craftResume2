import type { CoverLetter, ResumeData } from './types';

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
  companyAddress: 'Bengaluru, India',
  role: 'Senior Product Designer',
  date: '',
  greeting: 'Dear Hiring Manager,',
  body: "I am writing about the Senior Product Designer role. I have spent seven years on B2B software, most recently owning onboarding and the design system at Northwind Systems, and your posting describes the part of the work I like most: dense interfaces that have to stay legible under real data.\n\nTwo things I would bring on day one. I rebuilt an onboarding flow that took activation from 34% to 61% in two quarters, and I established a design system that four product teams and thirty engineers now build against without asking a designer first. Both were as much about writing things down and holding a cadence as about the interface itself.\n\nI would welcome the chance to talk about what the first ninety days would look like. Thank you for your time and for reading this far.",
  signOff: 'Sincerely,',
};

/**
 * Prefilled content so a new editor never opens on an empty page.
 *
 * Deliberately kept to one A4 sheet on every layout — two roles, one
 * qualification, one project, and short lines throughout. A sample that spills
 * onto a second page teaches the wrong lesson about how long a resume should
 * be, and it means the first thing a new user has to do is delete things.
 */
export const SAMPLE_RESUME: ResumeData = {
  basics: {
    fullName: 'Ananya Rao',
    title: 'Senior Product Designer',
    email: 'ananya.rao@email.com',
    phone: '+91 98200 41122',
    location: 'Bengaluru, India',
    website: 'ananyarao.design',
    linkedin: 'linkedin.com/in/ananyarao',
    github: '',
    summary:
      'Product designer with 7 years on B2B software, from research through shipped interface. I care about information density, empty states and the seams between teams.',
  },
  experience: [
    {
      id: 'exp-1',
      role: 'Senior Product Designer',
      company: 'Northwind Systems',
      location: 'Bengaluru',
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
      school: 'National Institute of Design',
      location: 'Ahmedabad',
      start: '2015',
      end: '2019',
      note: '',
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
    { id: 'lng-2', name: 'Hindi', level: 'Native / Bilingual' },
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

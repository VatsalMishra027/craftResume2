import type { ResumeData } from './types';

/** Prefilled content so a new editor never opens on an empty page. */
export const SAMPLE_RESUME: ResumeData = {
  basics: {
    fullName: 'Ananya Rao',
    title: 'Senior Product Designer',
    email: 'ananya.rao@email.com',
    phone: '+91 98200 41122',
    location: 'Bengaluru, India',
    website: 'ananyarao.design',
    linkedin: 'linkedin.com/in/ananyarao',
    github: 'github.com/ananyarao',
    summary:
      'Product designer with 7 years shaping B2B software end to end — research through shipped interface. I care about the boring parts: information density, empty states, and the seams between teams.',
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
        'Rebuilt the onboarding flow, lifting activation from 34% to 61% in two quarters.\nEstablished the design system now used by 4 product teams and 30+ engineers.\nRan a quarterly research cadence that shifted the 2024 roadmap away from two planned features.',
    },
    {
      id: 'exp-2',
      role: 'Product Designer',
      company: 'Halcyon Labs',
      location: 'Remote',
      start: '2019',
      end: '2022',
      bullets:
        'Owned the analytics dashboard used daily by 12,000 customers.\nCut reported support tickets on billing by 41% after a pricing-page rewrite.\nMentored two junior designers through their first end-to-end launches.',
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
      note: 'Graduated with distinction. Thesis on error states in clinical software.',
    },
  ],
  projects: [
    {
      id: 'prj-1',
      name: 'Fieldnote',
      link: 'fieldnote.app',
      description:
        'An offline-first research notebook for field interviews. 4,000 monthly users, built and maintained solo.',
      tech: 'Figma, React, IndexedDB',
    },
    {
      id: 'prj-2',
      name: 'Density',
      link: 'density.tools',
      description:
        'A small type-scale tool that shows how a layout breaks before you commit to it.',
      tech: 'TypeScript, Canvas',
    },
  ],
  skills: [
    { id: 'skl-1', name: 'Product strategy', level: 5 },
    { id: 'skl-2', name: 'User research', level: 5 },
    { id: 'skl-3', name: 'Design systems', level: 5 },
    { id: 'skl-4', name: 'Prototyping', level: 4 },
    { id: 'skl-5', name: 'Figma', level: 5 },
    { id: 'skl-6', name: 'Accessibility (WCAG)', level: 4 },
    { id: 'skl-7', name: 'HTML & CSS', level: 4 },
    { id: 'skl-8', name: 'Workshop facilitation', level: 4 },
  ],
  languages: [
    { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
    { id: 'lng-2', name: 'Hindi', level: 'Native / Bilingual' },
    { id: 'lng-3', name: 'Kannada', level: 'Professional Working' },
  ],
  certifications: [
    {
      id: 'crt-1',
      name: 'NN/g UX Certification',
      issuer: 'Nielsen Norman Group',
      date: '2023-04',
    },
    {
      id: 'crt-2',
      name: 'Accessibility Core Competencies (CPACC)',
      issuer: 'IAAP',
      date: '2021-09',
    },
  ],
  publications: [
    {
      id: 'pub-1',
      title: 'Designing for the fifteenth screen of the day',
      meta: 'Config India 2024 — conference talk',
    },
    {
      id: 'pub-2',
      title: 'Empty states are a research artefact',
      meta: 'Smashing Magazine, 2022',
    },
  ],
  interests: [
    { id: 'int-1', name: 'Typography' },
    { id: 'int-2', name: 'Long-distance cycling' },
    { id: 'int-3', name: 'Letterpress printing' },
  ],
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
  },
  experience: [],
  education: [],
  projects: [],
  skills: [],
  languages: [],
  certifications: [],
  publications: [],
  interests: [],
};

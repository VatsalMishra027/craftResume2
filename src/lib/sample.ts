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
      note: 'Graduated with distinction',
    },
  ],
  projects: [
    {
      id: 'prj-1',
      name: 'Fieldnote',
      link: 'fieldnote.app',
      description:
        'An offline-first research notebook for field interviews. 4,000 monthly users, built and maintained solo.',
    },
  ],
  skills:
    'Product strategy, User research, Design systems, Prototyping, Figma, Accessibility (WCAG), HTML & CSS, Workshop facilitation',
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
    summary: '',
  },
  experience: [],
  education: [],
  projects: [],
  skills: '',
};

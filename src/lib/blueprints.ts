import type { ResumeData } from './types';

/**
 * Role blueprints.
 *
 * Each one is a complete resume written for a particular job family, so a new
 * user can open the editor on a page that already reads like the job they are
 * applying for and edit over it rather than face a blank form. The wording is
 * original and the numbers are illustrative — every line is meant to be
 * replaced with the applicant's own record.
 */

/** The eight shelves the blueprint picker sorts roles onto. Order is display order. */
export const ROLE_CATEGORIES = [
  'Engineering',
  'Product',
  'Data & AI',
  'Executive',
  'Finance',
  'Marketing',
  'Design',
  'Healthcare',
] as const;

export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export interface Blueprint {
  id: string;
  /** The job title the record is written for. */
  role: string;
  category: RoleCategory;
  /** Roughly who it fits — shown under the role name on the card. */
  seniority: string;
  /** One line on what opening it actually gives you. */
  blurb: string;
  /** Layout and print colour the record was written against. */
  template: string;
  accent: string;
  /** Section headings and terms a screen for this role tends to look for. */
  keywords: string[];
  data: ResumeData;
}

export const BLUEPRINTS: Blueprint[] = [
  /* ---------------------------------------------------------------- Engineering */
  {
    id: 'software-engineer',
    role: 'Software Engineer',
    category: 'Engineering',
    seniority: 'Mid to senior · backend and platform',
    blurb: 'Systems work framed by scale, latency and reliability rather than task lists.',
    template: 'cascade',
    accent: 'midnight',
    keywords: ['Distributed systems', 'API design', 'CI/CD', 'Kubernetes', 'Observability'],
    data: {
      basics: {
        fullName: 'Arjun Mehta',
        title: 'Senior Software Engineer',
        email: 'arjun.mehta@email.com',
        phone: '+91 98450 22178',
        location: 'Bengaluru, India',
        website: 'arjunmehta.dev',
        linkedin: 'linkedin.com/in/arjunmehta',
        github: 'github.com/arjunmehta',
        summary:
          'Backend engineer with 6 years on high-traffic payment and identity systems. I work close to the data layer: schema design, queue semantics, the failure modes nobody writes down.',
      },
      experience: [
        {
          id: 'exp-1',
          role: 'Senior Software Engineer',
          company: 'Northwind Payments',
          location: 'Bengaluru',
          start: '2022',
          end: 'Present',
          bullets:
            'Re-architected the settlement pipeline from nightly batch to event-driven, cutting reconciliation lag from 14 hours to 4 minutes.\nOwned the idempotency layer behind 40M monthly transactions; duplicate charges went from 11 a quarter to zero.\nIntroduced structured tracing across 9 services, taking median incident diagnosis from 45 minutes to 8.',
        },
        {
          id: 'exp-2',
          role: 'Software Engineer',
          company: 'Halcyon Systems',
          location: 'Pune',
          start: '2019',
          end: '2022',
          bullets:
            'Built the public REST and webhook API now used by 600+ integration partners.\nCut p99 latency on the catalogue service from 820ms to 140ms by replacing an N+1 read path.',
        },
      ],
      education: [
        {
          id: 'edu-1',
          degree: 'B.Tech, Computer Science and Engineering',
          school: 'National Institute of Technology, Surathkal',
          location: 'Karnataka',
          start: '2015',
          end: '2019',
          note: 'CGPA 8.7/10.',
        },
      ],
      projects: [
        {
          id: 'prj-1',
          name: 'Ratchet',
          link: 'github.com/arjunmehta/ratchet',
          description:
            'An open-source rate limiter for Go services with a sliding-window Redis backend.',
          tech: 'Go, Redis, gRPC',
        },
      ],
      skills: [
        { id: 'skl-1', name: 'Go', level: 5 },
        { id: 'skl-2', name: 'Python', level: 4 },
        { id: 'skl-3', name: 'TypeScript', level: 4 },
        { id: 'skl-4', name: 'PostgreSQL', level: 5 },
        { id: 'skl-5', name: 'Kafka', level: 4 },
        { id: 'skl-6', name: 'Kubernetes', level: 4 },
        { id: 'skl-7', name: 'AWS', level: 4 },
        { id: 'skl-8', name: 'Distributed systems design', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Hindi', level: 'Native / Bilingual' },
      ],
      certifications: [
        {
          id: 'crt-1',
          name: 'AWS Certified Solutions Architect — Associate',
          issuer: 'Amazon Web Services',
          date: '2023-06',
        },
      ],
      publications: [],
      interests: [
        { id: 'int-1', name: 'Open source' },
        { id: 'int-2', name: 'Trail running' },
      ],
    },
  },

  /* -------------------------------------------------------------------- Product */
  {
    id: 'product-manager',
    role: 'Product Manager',
    category: 'Product',
    seniority: 'Senior · B2B SaaS',
    blurb: 'Outcome-led bullets: adoption, retention and the bets that did not ship.',
    template: 'lattice',
    accent: 'teal',
    keywords: ['Roadmap', 'Discovery', 'A/B testing', 'Stakeholder management', 'OKRs'],
    data: {
      basics: {
        fullName: 'Priya Nandakumar',
        title: 'Senior Product Manager',
        email: 'priya.nandakumar@email.com',
        phone: '+91 99000 31544',
        location: 'Hyderabad, India',
        website: 'priyanandakumar.com',
        linkedin: 'linkedin.com/in/priyanandakumar',
        github: '',
        summary:
          'Product manager with 7 years in B2B SaaS, mostly on workflow tools people are obliged to use rather than choose. I run discovery properly and write the tradeoff down.',
      },
      experience: [
        {
          id: 'exp-1',
          role: 'Senior Product Manager',
          company: 'Fielding Software',
          location: 'Hyderabad',
          start: '2022',
          end: 'Present',
          bullets:
            'Own the workflow automation line — $14M ARR, 3 squads, 21 engineers and designers.\nRebuilt activation around a guided first task, taking week-one activation from 31% to 58%.\nSet the pricing and packaging for the enterprise tier now carrying 34% of new revenue.',
        },
        {
          id: 'exp-2',
          role: 'Product Manager',
          company: 'Caraway Analytics',
          location: 'Bengaluru',
          start: '2019',
          end: '2022',
          bullets:
            'Launched the self-serve reporting product from zero to 4,200 paying accounts in 18 months.\nCut time-to-first-report from 22 minutes to 4 by rewriting the template gallery.',
        },
      ],
      education: [
        {
          id: 'edu-1',
          degree: 'MBA, Marketing and Strategy',
          school: 'Indian School of Business',
          location: 'Hyderabad',
          start: '2016',
          end: '2018',
          note: 'Dean’s list.',
        },
        {
          id: 'edu-2',
          degree: 'B.E., Information Technology',
          school: 'Anna University',
          location: 'Chennai',
          start: '2011',
          end: '2015',
          note: '',
        },
      ],
      projects: [
        {
          id: 'prj-1',
          name: 'The Discovery Log',
          link: 'discoverylog.substack.com',
          description:
            'A newsletter on customer discovery for B2B teams. 6,800 subscribers, written fortnightly.',
          tech: 'Writing, Research',
        },
      ],
      skills: [
        { id: 'skl-1', name: 'Product discovery', level: 5 },
        { id: 'skl-2', name: 'Roadmap and prioritisation', level: 5 },
        { id: 'skl-3', name: 'A/B testing and experimentation', level: 4 },
        { id: 'skl-4', name: 'SQL and product analytics', level: 4 },
        { id: 'skl-5', name: 'Pricing and packaging', level: 4 },
        { id: 'skl-6', name: 'Stakeholder management', level: 5 },
        { id: 'skl-7', name: 'Amplitude, Mixpanel, Looker', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Tamil', level: 'Native / Bilingual' },
      ],
      certifications: [
        {
          id: 'crt-1',
          name: 'Certified Scrum Product Owner (CSPO)',
          issuer: 'Scrum Alliance',
          date: '2021-03',
        },
      ],
      publications: [
        {
          id: 'pub-1',
          title: 'The two questions that kill most feature requests',
          meta: 'Mind the Product, 2023',
        },
      ],
      interests: [
        { id: 'int-1', name: 'Behavioural economics' },
        { id: 'int-2', name: 'Carnatic music' },
      ],
    },
  },

  /* ----------------------------------------------------------------- Data & AI */
  {
    id: 'data-scientist',
    role: 'Data Scientist',
    category: 'Data & AI',
    seniority: 'Mid to senior · ML in production',
    blurb: 'Models judged on the business metric they moved, not the notebook they lived in.',
    template: 'atlas',
    accent: 'indigo',
    keywords: ['Machine learning', 'Python', 'A/B testing', 'MLOps', 'Feature engineering'],
    data: {
      basics: {
        fullName: 'Sneha Iyer',
        title: 'Senior Data Scientist',
        email: 'sneha.iyer@email.com',
        phone: '+91 98111 40922',
        location: 'Gurugram, India',
        website: 'snehaiyer.io',
        linkedin: 'linkedin.com/in/snehaiyer',
        github: 'github.com/snehaiyer',
        summary:
          'Data scientist with 6 years shipping models that stay shipped. Fraud and pricing mostly, with feature stores, drift monitors and retraining treated as part of the job.',
      },
      experience: [
        {
          id: 'exp-1',
          role: 'Senior Data Scientist',
          company: 'Meridian Commerce',
          location: 'Gurugram',
          start: '2022',
          end: 'Present',
          bullets:
            'Own the fraud stack scoring 2.3M transactions a day; caught fraud value up 38% at a 0.4pp lower false-positive rate.\nBuilt the feature store behind 11 production models, cutting time-to-first-prediction from 6 weeks to 9 days.\nRan the causal analysis behind a pricing change worth an estimated ₹19 crore in annual margin.',
        },
        {
          id: 'exp-2',
          role: 'Data Scientist',
          company: 'Lantern Health Analytics',
          location: 'Bengaluru',
          start: '2019',
          end: '2022',
          bullets:
            'Built a readmission-risk model deployed across 14 hospital partners, AUC 0.81 on held-out data.\nReplaced a rules engine for appointment no-shows with a gradient-boosted model, cutting unfilled slots by 23%.',
        },
      ],
      education: [
        {
          id: 'edu-1',
          degree: 'M.Sc., Statistics',
          school: 'Indian Statistical Institute',
          location: 'Kolkata',
          start: '2017',
          end: '2019',
          note: 'Thesis on calibration under class imbalance.',
        },
        {
          id: 'edu-2',
          degree: 'B.Sc. (Hons), Mathematics',
          school: 'St. Stephen’s College, University of Delhi',
          location: 'Delhi',
          start: '2014',
          end: '2017',
          note: '',
        },
      ],
      projects: [
        {
          id: 'prj-1',
          name: 'Driftwatch',
          link: 'github.com/snehaiyer/driftwatch',
          description:
            'A drift-detection library that compares live feature distributions against a training snapshot.',
          tech: 'Python, Pandas, Prometheus',
        },
      ],
      skills: [
        { id: 'skl-1', name: 'Python', level: 5 },
        { id: 'skl-2', name: 'SQL', level: 5 },
        { id: 'skl-3', name: 'scikit-learn, XGBoost', level: 5 },
        { id: 'skl-4', name: 'PyTorch', level: 4 },
        { id: 'skl-5', name: 'Causal inference', level: 4 },
        { id: 'skl-6', name: 'Experiment design', level: 5 },
        { id: 'skl-7', name: 'Spark', level: 4 },
        { id: 'skl-8', name: 'dbt and Airflow', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Tamil', level: 'Native / Bilingual' },
      ],
      certifications: [
        {
          id: 'crt-1',
          name: 'Google Cloud Professional Machine Learning Engineer',
          issuer: 'Google Cloud',
          date: '2023-01',
        },
        {
          id: 'crt-2',
          name: 'Databricks Certified Data Engineer Associate',
          issuer: 'Databricks',
          date: '2022-08',
        },
      ],
      publications: [
        {
          id: 'pub-1',
          title: 'Calibration beats accuracy when the threshold is a business decision',
          meta: 'PyData Delhi 2023 — conference talk',
        },
      ],
      interests: [
        { id: 'int-1', name: 'Forecasting competitions' },
        { id: 'int-2', name: 'Chess' },
      ],
    },
  },

  /* ------------------------------------------------------------------ Executive */
  {
    id: 'engineering-director',
    role: 'Director of Engineering',
    category: 'Executive',
    seniority: 'Director to VP · 40+ reports',
    blurb: 'Scope, budget and org outcomes up front, with the delivery record underneath.',
    template: 'summit',
    accent: 'graphite',
    keywords: ['Org design', 'P&L', 'Platform strategy', 'Hiring', 'Operational excellence'],
    data: {
      basics: {
        fullName: 'Rohan Deshpande',
        title: 'Director of Engineering',
        email: 'rohan.deshpande@email.com',
        phone: '+91 98200 76310',
        location: 'Mumbai, India',
        website: '',
        linkedin: 'linkedin.com/in/rohandeshpande',
        github: '',
        summary:
          'Engineering leader with 14 years across product and platform, the last 5 running multi-team orgs. I measure myself on whether the teams under me ship without me in the room.',
      },
      experience: [
        {
          id: 'exp-1',
          role: 'Director of Engineering, Platform',
          company: 'Fairmount Financial Technologies',
          location: 'Mumbai',
          start: '2021',
          end: 'Present',
          bullets:
            'Lead 46 engineers across 6 teams and a $7.2M annual budget; own platform, data and developer experience.\nTook change failure rate from 18% to 4% and deployment frequency from fortnightly to 40+ a week.\nDrove the consolidation that retired 3 overlapping services and removed $1.9M of annual infrastructure spend.\nBuilt the levelling framework now used company-wide; regretted attrition fell from 19% to 7%.',
        },
        {
          id: 'exp-2',
          role: 'Engineering Manager to Senior Manager',
          company: 'Northwind Systems',
          location: 'Pune',
          start: '2016',
          end: '2021',
          bullets:
            'Grew a single team of 8 into three teams of 24, hiring 19 engineers and promoting 6 to senior.\nDelivered the multi-region migration that took the platform from 99.5% to 99.97% availability.',
        },
        {
          id: 'exp-3',
          role: 'Senior Software Engineer',
          company: 'Halcyon Labs',
          location: 'Pune',
          start: '2011',
          end: '2016',
          bullets:
            'Technical lead on the billing rewrite that carried the company through its Series C scale-up.',
        },
      ],
      education: [
        {
          id: 'edu-1',
          degree: 'B.E., Computer Engineering',
          school: 'College of Engineering, Pune',
          location: 'Maharashtra',
          start: '2007',
          end: '2011',
          note: '',
        },
      ],
      projects: [
        {
          id: 'prj-1',
          name: 'Engineering Levelling Framework',
          link: '',
          description:
            'Authored the company’s eight-level engineering ladder and the calibration process behind it.',
          tech: 'Org design, Calibration',
        },
      ],
      skills: [
        { id: 'skl-1', name: 'Organisational design', level: 5 },
        { id: 'skl-2', name: 'Platform strategy', level: 5 },
        { id: 'skl-3', name: 'Budget and vendor management', level: 4 },
        { id: 'skl-4', name: 'Hiring and calibration', level: 5 },
        { id: 'skl-5', name: 'Operational excellence (DORA)', level: 5 },
        { id: 'skl-6', name: 'Executive communication', level: 5 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Marathi', level: 'Native / Bilingual' },
      ],
      certifications: [
        {
          id: 'crt-1',
          name: 'Executive Programme in General Management',
          issuer: 'IIM Bangalore',
          date: '2020-11',
        },
      ],
      publications: [
        {
          id: 'pub-1',
          title: 'What a platform team owes its customers',
          meta: 'LeadDev India 2024 — keynote',
        },
      ],
      interests: [
        { id: 'int-1', name: 'Mentoring first-time managers' },
        { id: 'int-2', name: 'Long-distance cycling' },
      ],
    },
  },

  /* -------------------------------------------------------------------- Finance */
  {
    id: 'financial-analyst',
    role: 'Financial Analyst',
    category: 'Finance',
    seniority: 'Analyst to senior analyst · FP&A',
    blurb: 'A conservative single column — the layout strict banking parsers handle best.',
    template: 'ledger',
    accent: 'navy',
    keywords: ['FP&A', 'Financial modelling', 'Variance analysis', 'Forecasting', 'IFRS'],
    data: {
      basics: {
        fullName: 'Kavita Ramachandran',
        title: 'Senior Financial Analyst',
        email: 'kavita.ramachandran@email.com',
        phone: '+91 99870 21345',
        location: 'Mumbai, India',
        website: '',
        linkedin: 'linkedin.com/in/kavitaramachandran',
        github: '',
        summary:
          'FP&A analyst with 6 years supporting revenue and cost centres at scale. I build models other people can audit, and I explain a variance honestly in week one.',
      },
      experience: [
        {
          id: 'exp-1',
          role: 'Senior Financial Analyst, FP&A',
          company: 'Fairmount Industries',
          location: 'Mumbai',
          start: '2022',
          end: 'Present',
          bullets:
            'Own the annual operating plan and rolling 18-month forecast for a ₹840 crore revenue division.\nRebuilt the driver-based revenue model, cutting quarterly forecast error from 9.4% to 3.1%.\nLed the cost review that identified ₹22 crore of annualised savings across procurement and logistics.',
        },
        {
          id: 'exp-2',
          role: 'Financial Analyst',
          company: 'Caraway Capital Advisors',
          location: 'Mumbai',
          start: '2019',
          end: '2022',
          bullets:
            'Built three-statement and DCF models supporting 11 mid-market transactions worth ₹2,400 crore.\nProduced the quarterly board reporting pack for a portfolio of 8 companies.',
        },
      ],
      education: [
        {
          id: 'edu-1',
          degree: 'Chartered Accountant (CA)',
          school: 'Institute of Chartered Accountants of India',
          location: 'India',
          start: '2016',
          end: '2019',
          note: 'Cleared all levels on first attempt.',
        },
        {
          id: 'edu-2',
          degree: 'B.Com (Hons), Accounting and Finance',
          school: 'Narsee Monjee College of Commerce and Economics',
          location: 'Mumbai',
          start: '2013',
          end: '2016',
          note: '',
        },
      ],
      projects: [
        {
          id: 'prj-1',
          name: 'Close Pack Automation',
          link: '',
          description:
            'Replaced 14 linked workbooks with one governed Power BI model, ending the month-end handover.',
          tech: 'Power BI, SQL, Excel',
        },
      ],
      skills: [
        { id: 'skl-1', name: 'Financial modelling', level: 5 },
        { id: 'skl-2', name: 'Budgeting and forecasting', level: 5 },
        { id: 'skl-3', name: 'Variance analysis', level: 5 },
        { id: 'skl-4', name: 'Advanced Excel', level: 5 },
        { id: 'skl-5', name: 'Power BI', level: 4 },
        { id: 'skl-6', name: 'SAP FICO', level: 4 },
        { id: 'skl-7', name: 'IFRS and Ind AS', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Hindi', level: 'Native / Bilingual' },
      ],
      certifications: [
        {
          id: 'crt-1',
          name: 'CFA Level II Candidate',
          issuer: 'CFA Institute',
          date: '2024-05',
        },
      ],
      publications: [],
      interests: [
        { id: 'int-1', name: 'Public markets' },
        { id: 'int-2', name: 'Classical dance' },
      ],
    },
  },

  /* ------------------------------------------------------------------ Marketing */
  {
    id: 'marketing-manager',
    role: 'Marketing Manager',
    category: 'Marketing',
    seniority: 'Manager · growth and demand generation',
    blurb: 'Channel results, CAC and pipeline — the numbers a marketing screen looks for.',
    template: 'pulse',
    accent: 'crimson',
    keywords: ['Demand generation', 'SEO', 'Paid acquisition', 'Lifecycle', 'Attribution'],
    data: {
      basics: {
        fullName: 'Nikhil Bhatt',
        title: 'Growth Marketing Manager',
        email: 'nikhil.bhatt@email.com',
        phone: '+91 98700 55214',
        location: 'Bengaluru, India',
        website: 'nikhilbhatt.co',
        linkedin: 'linkedin.com/in/nikhilbhatt',
        github: '',
        summary:
          'Growth marketer with 7 years running acquisition and lifecycle for subscription businesses. At home in the ad account and the analytics warehouse, and happy to turn off a channel that is not paying.',
      },
      experience: [
        {
          id: 'exp-1',
          role: 'Growth Marketing Manager',
          company: 'Fieldwork Software',
          location: 'Bengaluru',
          start: '2022',
          end: 'Present',
          bullets:
            'Run a ₹9 crore annual budget across paid search, paid social, SEO and lifecycle; team of 5 plus two agencies.\nGrew qualified pipeline 2.4x in 18 months while holding blended CAC flat.\nRebuilt organic search around 40 intent-led pages, taking non-brand traffic from 22k to 91k sessions a month.',
        },
        {
          id: 'exp-2',
          role: 'Performance Marketing Specialist',
          company: 'Halcyon Retail',
          location: 'Mumbai',
          start: '2018',
          end: '2022',
          bullets:
            'Scaled paid acquisition from ₹40 lakh to ₹5.6 crore annual spend at a 3.8x blended ROAS.\nLaunched the referral programme that now accounts for 11% of new customers.',
        },
      ],
      education: [
        {
          id: 'edu-1',
          degree: 'MBA, Marketing',
          school: 'Symbiosis Institute of Business Management',
          location: 'Pune',
          start: '2016',
          end: '2018',
          note: '',
        },
        {
          id: 'edu-2',
          degree: 'B.A., Economics',
          school: 'Fergusson College',
          location: 'Pune',
          start: '2013',
          end: '2016',
          note: '',
        },
      ],
      projects: [
        {
          id: 'prj-1',
          name: 'The Attribution Notebook',
          link: 'attributionnotebook.com',
          description:
            'A working guide to multi-touch attribution for teams without a data scientist.',
          tech: 'Writing, SQL, Looker Studio',
        },
      ],
      skills: [
        { id: 'skl-1', name: 'Demand generation', level: 5 },
        { id: 'skl-2', name: 'Paid search and paid social', level: 5 },
        { id: 'skl-3', name: 'SEO and content strategy', level: 4 },
        { id: 'skl-4', name: 'Lifecycle and CRM', level: 4 },
        { id: 'skl-5', name: 'Marketing analytics and attribution', level: 4 },
        { id: 'skl-6', name: 'HubSpot and Salesforce', level: 4 },
        { id: 'skl-7', name: 'Budget management', level: 5 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Gujarati', level: 'Native / Bilingual' },
      ],
      certifications: [
        {
          id: 'crt-1',
          name: 'Google Ads Search Certification',
          issuer: 'Google',
          date: '2024-02',
        },
        {
          id: 'crt-2',
          name: 'HubSpot Inbound Marketing Certification',
          issuer: 'HubSpot Academy',
          date: '2023-05',
        },
      ],
      publications: [
        {
          id: 'pub-1',
          title: 'Turning off the channel that made your quarter',
          meta: 'SaaSBoomi 2024 — talk',
        },
      ],
      interests: [
        { id: 'int-1', name: 'Consumer psychology' },
        { id: 'int-2', name: 'Film photography' },
      ],
    },
  },

  /* --------------------------------------------------------------------- Design */
  {
    id: 'product-designer',
    role: 'Product Designer',
    category: 'Design',
    seniority: 'Senior · end-to-end product design',
    blurb: 'Portfolio-forward, with research and systems work given equal billing.',
    template: 'vertex',
    accent: 'plum',
    keywords: ['User research', 'Design systems', 'Prototyping', 'Accessibility', 'Figma'],
    data: {
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
          'Product designer with 7 years shaping B2B software end to end. I care about the boring parts: information density, empty states, and the seams between teams.',
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
            'Rebuilt onboarding, lifting activation from 34% to 61% in two quarters.\nEstablished the design system now used by 4 product teams and 30+ engineers.\nTook the core product to WCAG 2.1 AA, closing 140 audit findings in 9 months.',
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
          description:
            'An offline-first research notebook for field interviews. 4,000 monthly users, built solo.',
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
        { id: 'skl-7', name: 'Workshop facilitation', level: 4 },
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
          date: '2023-04',
        },
      ],
      publications: [
        {
          id: 'pub-1',
          title: 'Designing for the fifteenth screen of the day',
          meta: 'Config India 2024 — conference talk',
        },
      ],
      interests: [
        { id: 'int-1', name: 'Typography' },
        { id: 'int-2', name: 'Letterpress printing' },
      ],
    },
  },

  /* ----------------------------------------------------------------- Healthcare */
  {
    id: 'registered-nurse',
    role: 'Registered Nurse',
    category: 'Healthcare',
    seniority: 'Staff to charge nurse · critical care',
    blurb: 'Licences and credentials sit above the record, where a credentialling check looks.',
    template: 'helix',
    accent: 'emerald',
    keywords: ['Critical care', 'Patient safety', 'BLS/ACLS', 'Care planning', 'EMR'],
    data: {
      basics: {
        fullName: 'Meera Joseph',
        title: 'Registered Nurse — Critical Care',
        email: 'meera.joseph@email.com',
        phone: '+91 94470 30188',
        location: 'Kochi, India',
        website: '',
        linkedin: 'linkedin.com/in/meerajoseph',
        github: '',
        summary:
          'Critical care nurse with 8 years in tertiary ICUs, 3 of them as charge nurse on a 22-bed unit. Ventilator management, family communication under pressure, and the quality work that keeps preventable events off the ward.',
      },
      experience: [
        {
          id: 'exp-1',
          role: 'Charge Nurse, Medical ICU',
          company: 'Aster Medcity',
          location: 'Kochi',
          start: '2021',
          end: 'Present',
          bullets:
            'Lead a shift team of 9 nurses across a 22-bed medical ICU with a 1:2 acuity ratio.\nCo-led the CLABSI bundle that took central-line infections from 2.4 to 0.6 per 1,000 line-days.\nPrecept 4 to 6 new graduate nurses a year through the unit’s 12-week critical care orientation.',
        },
        {
          id: 'exp-2',
          role: 'Staff Nurse, Surgical ICU',
          company: 'Amrita Institute of Medical Sciences',
          location: 'Kochi',
          start: '2017',
          end: '2021',
          bullets:
            'Managed post-operative cardiac and neurosurgical patients, including ventilator weaning and vasoactive titration.\nServed as super-user for the EMR rollout, training 60+ nursing staff across three units.',
        },
      ],
      education: [
        {
          id: 'edu-1',
          degree: 'M.Sc. Nursing, Critical Care',
          school: 'Manipal College of Nursing',
          location: 'Manipal',
          start: '2019',
          end: '2021',
          note: 'Dissertation on early mobilisation in ventilated patients.',
        },
        {
          id: 'edu-2',
          degree: 'B.Sc. Nursing',
          school: 'Government College of Nursing',
          location: 'Kottayam',
          start: '2012',
          end: '2016',
          note: '',
        },
      ],
      // Left empty: a nursing resume rarely carries a projects section, and on
      // a one-page sheet the clinical record and the licences earn the space.
      projects: [],
      skills: [
        { id: 'skl-1', name: 'Critical care nursing', level: 5 },
        { id: 'skl-2', name: 'Ventilator management', level: 5 },
        { id: 'skl-3', name: 'Haemodynamic monitoring', level: 5 },
        { id: 'skl-4', name: 'Patient and family education', level: 5 },
        { id: 'skl-6', name: 'Infection prevention', level: 4 },
        { id: 'skl-7', name: 'EMR (Cerner, Epic)', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Malayalam', level: 'Native / Bilingual' },
      ],
      certifications: [
        {
          id: 'crt-1',
          name: 'Registered Nurse and Registered Midwife (RN, RM) — Licence 2016/KL/44210',
          issuer: 'Kerala Nurses and Midwives Council',
          date: 'Valid to 2027-03',
        },
        {
          id: 'crt-2',
          name: 'Advanced Cardiovascular Life Support (ACLS)',
          issuer: 'American Heart Association',
          date: 'Valid to 2026-08',
        },
      ],
      publications: [],
      interests: [
        { id: 'int-1', name: 'Clinical education' },
        { id: 'int-2', name: 'Choral singing' },
      ],
    },
  },
];

export function isBlueprintId(value: string | null | undefined): boolean {
  return !!value && BLUEPRINTS.some((b) => b.id === value);
}

export function getBlueprint(id: string | null | undefined): Blueprint | undefined {
  return BLUEPRINTS.find((b) => b.id === id);
}

/** Blueprints grouped by role category, in category order. */
export function blueprintsByCategory(): { category: RoleCategory; items: Blueprint[] }[] {
  return ROLE_CATEGORIES.map((category) => ({
    category,
    items: BLUEPRINTS.filter((b) => b.category === category),
  })).filter((group) => group.items.length > 0);
}

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
          'Backend engineer with 6 years on high-traffic payment and identity systems. I work close to the data layer — schema design, queue semantics, the failure modes nobody writes down — and I leave services easier to operate than I found them.',
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
            'Re-architected the settlement pipeline from nightly batch to event-driven, cutting reconciliation lag from 14 hours to under 4 minutes.\nOwned the idempotency layer behind 40M monthly transactions; duplicate-charge incidents went from 11 a quarter to zero.\nIntroduced structured tracing across 9 services, which took median incident diagnosis from 45 minutes to 8.\nMentored 4 engineers through their first on-call rotation and wrote the runbooks the team still uses.',
        },
        {
          id: 'exp-2',
          role: 'Software Engineer',
          company: 'Halcyon Systems',
          location: 'Pune',
          start: '2019',
          end: '2022',
          bullets:
            'Built the public REST and webhook API now used by 600+ integration partners.\nCut p99 latency on the core catalogue service from 820ms to 140ms by replacing an N+1 read path with a denormalised projection.\nMigrated 60+ services from hand-rolled deploy scripts to a templated CI/CD pipeline, taking release time from 50 minutes to 6.',
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
          note: 'CGPA 8.7/10. Final year project on consensus behaviour under network partition.',
        },
      ],
      projects: [
        {
          id: 'prj-1',
          name: 'Ratchet',
          link: 'github.com/arjunmehta/ratchet',
          description:
            'An open-source rate limiter for Go services with a sliding-window Redis backend. 1.4k stars, used in production by three companies I know of.',
          tech: 'Go, Redis, gRPC',
        },
        {
          id: 'prj-2',
          name: 'Schema Drift',
          link: 'schemadrift.dev',
          description:
            'A CLI that diffs a live Postgres schema against migrations in version control and fails CI when they disagree.',
          tech: 'TypeScript, PostgreSQL, GitHub Actions',
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
        { id: 'skl-8', name: 'Terraform', level: 3 },
        { id: 'skl-9', name: 'Distributed systems design', level: 4 },
        { id: 'skl-10', name: 'Observability (OpenTelemetry)', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Hindi', level: 'Native / Bilingual' },
        { id: 'lng-3', name: 'Kannada', level: 'Conversational' },
      ],
      certifications: [
        {
          id: 'crt-1',
          name: 'AWS Certified Solutions Architect — Associate',
          issuer: 'Amazon Web Services',
          date: '2023-06',
        },
        {
          id: 'crt-2',
          name: 'Certified Kubernetes Application Developer (CKAD)',
          issuer: 'Cloud Native Computing Foundation',
          date: '2022-02',
        },
      ],
      publications: [
        {
          id: 'pub-1',
          title: 'Idempotency keys are a product decision, not a database one',
          meta: 'Northwind Engineering Blog, 2024',
        },
      ],
      interests: [
        { id: 'int-1', name: 'Open source' },
        { id: 'int-2', name: 'Distributed systems papers' },
        { id: 'int-3', name: 'Trail running' },
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
          'Product manager with 7 years in B2B SaaS, most of it on workflow tools that people are obliged to use rather than choose. I run discovery properly, write the tradeoff down, and would rather kill a feature in week two than ship it in month six.',
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
            'Own the workflow automation line — $14M ARR, 3 squads, 21 engineers and designers.\nRebuilt activation around a guided first task, lifting week-one activation from 31% to 58% and 90-day retention by 12 points.\nRan 18 rounds of customer discovery in a year; two planned Q3 features were cut on the evidence, saving roughly two quarters of build.\nSet the pricing and packaging for the enterprise tier now carrying 34% of new revenue.',
        },
        {
          id: 'exp-2',
          role: 'Product Manager',
          company: 'Caraway Analytics',
          location: 'Bengaluru',
          start: '2019',
          end: '2022',
          bullets:
            'Launched the self-serve reporting product from zero to 4,200 paying accounts in 18 months.\nInstrumented the funnel end to end, which turned a monthly guess-and-argue meeting into a weekly A/B cadence.\nCut time-to-first-report from 22 minutes to 4 by rewriting the template gallery around the five reports people actually built.',
        },
        {
          id: 'exp-3',
          role: 'Associate Product Manager',
          company: 'Caraway Analytics',
          location: 'Bengaluru',
          start: '2018',
          end: '2019',
          bullets:
            'Ran the integrations backlog and shipped connectors for Salesforce, HubSpot and Snowflake.',
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
          note: 'Dean’s list. Capstone on pricing elasticity in seat-based SaaS.',
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
        { id: 'skl-7', name: 'Technical writing', level: 5 },
        { id: 'skl-8', name: 'Amplitude, Mixpanel, Looker', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Tamil', level: 'Native / Bilingual' },
        { id: 'lng-3', name: 'Telugu', level: 'Professional Working' },
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
          'Data scientist with 6 years shipping models that stay shipped. Fraud and pricing mostly, with the unglamorous half — feature stores, drift monitors, retraining schedules — treated as part of the job rather than someone else’s.',
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
            'Own the fraud detection stack scoring 2.3M transactions a day; caught fraud value up 38% at a 0.4pp lower false-positive rate.\nBuilt the feature store now backing 11 production models, cutting new-model time-to-first-prediction from 6 weeks to 9 days.\nStood up drift and performance monitoring that caught a silent upstream schema change 3 hours in rather than at the month-end review.\nRan the causal analysis behind a pricing change worth an estimated ₹19 crore in incremental annual margin.',
        },
        {
          id: 'exp-2',
          role: 'Data Scientist',
          company: 'Lantern Health Analytics',
          location: 'Bengaluru',
          start: '2019',
          end: '2022',
          bullets:
            'Built a readmission-risk model deployed across 14 hospital partners, AUC 0.81 on held-out data.\nReplaced a hand-tuned rules engine for appointment no-shows with a gradient-boosted model, cutting unfilled slots by 23%.\nWrote the team’s experiment-review template, which ended a long habit of calling wins on underpowered tests.',
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
          note: 'Thesis on calibration of tree ensembles under class imbalance.',
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
            'A lightweight drift-detection library that compares live feature distributions against a training snapshot and alerts on divergence.',
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
        { id: 'skl-8', name: 'MLflow and model registry', level: 4 },
        { id: 'skl-9', name: 'dbt and Airflow', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Hindi', level: 'Professional Working' },
        { id: 'lng-3', name: 'Tamil', level: 'Native / Bilingual' },
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
        {
          id: 'pub-2',
          title: 'A practical drift taxonomy for tabular models',
          meta: 'Towards Data Science, 2022',
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
          'Engineering leader with 14 years across product and platform, the last 5 running multi-team orgs. I have built groups from 8 people to 46, taken two platforms through a regulated audit, and I measure myself on whether the teams under me ship without me in the room.',
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
            'Lead 46 engineers across 6 teams and a $7.2M annual budget; own platform, data and developer experience.\nTook change failure rate from 18% to 4% and deployment frequency from fortnightly to 40+ a week by funding a dedicated delivery team.\nDrove the platform consolidation that retired 3 overlapping services and removed $1.9M of annual infrastructure spend.\nBuilt and ran the levelling and promotion framework now used company-wide; regretted attrition fell from 19% to 7%.\nCarried the engineering half of a SOC 2 Type II audit with no material findings.',
        },
        {
          id: 'exp-2',
          role: 'Engineering Manager to Senior Manager',
          company: 'Northwind Systems',
          location: 'Pune',
          start: '2016',
          end: '2021',
          bullets:
            'Grew a single team of 8 into three teams of 24, hiring 19 engineers and promoting 6 to senior.\nDelivered the multi-region migration that took the platform from 99.5% to 99.97% availability.\nIntroduced the incident review practice that the wider organisation later adopted as standard.',
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
            'Authored the company’s eight-level engineering ladder and the calibration process behind it; adopted across 3 business units.',
          tech: 'Org design, Calibration',
        },
      ],
      skills: [
        { id: 'skl-1', name: 'Organisational design', level: 5 },
        { id: 'skl-2', name: 'Platform strategy', level: 5 },
        { id: 'skl-3', name: 'Budget and vendor management', level: 4 },
        { id: 'skl-4', name: 'Hiring and calibration', level: 5 },
        { id: 'skl-5', name: 'Operational excellence (DORA)', level: 5 },
        { id: 'skl-6', name: 'Regulatory and audit readiness', level: 4 },
        { id: 'skl-7', name: 'Executive communication', level: 5 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Marathi', level: 'Native / Bilingual' },
        { id: 'lng-3', name: 'Hindi', level: 'Native / Bilingual' },
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
          'FP&A analyst with 6 years supporting revenue and cost centres at scale. I build models other people can audit, and I would rather explain a variance honestly in week one than defend a forecast for a quarter.',
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
            'Own the annual operating plan and rolling 18-month forecast for a ₹840 crore revenue division.\nRebuilt the driver-based revenue model, cutting quarterly forecast error from 9.4% to 3.1%.\nAutomated the monthly close pack in Power BI, taking a 4-day manual assembly down to a 3-hour refresh.\nLed the cost review that identified ₹22 crore of annualised savings across procurement and logistics.\nPartner to three business unit heads on headcount, capex and pricing decisions.',
        },
        {
          id: 'exp-2',
          role: 'Financial Analyst',
          company: 'Caraway Capital Advisors',
          location: 'Mumbai',
          start: '2019',
          end: '2022',
          bullets:
            'Built three-statement and DCF models supporting 11 mid-market transactions worth ₹2,400 crore combined.\nProduced the quarterly board reporting pack for a portfolio of 8 companies.\nStandardised the diligence checklist now used across the deal team.',
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
          note: 'First class with distinction.',
        },
      ],
      projects: [
        {
          id: 'prj-1',
          name: 'Close Pack Automation',
          link: '',
          description:
            'Replaced 14 linked workbooks with a single governed Power BI model, removing the month-end handover that had caused three restatements in two years.',
          tech: 'Power BI, SQL, Excel',
        },
      ],
      skills: [
        { id: 'skl-1', name: 'Financial modelling', level: 5 },
        { id: 'skl-2', name: 'Budgeting and forecasting', level: 5 },
        { id: 'skl-3', name: 'Variance analysis', level: 5 },
        { id: 'skl-4', name: 'Advanced Excel', level: 5 },
        { id: 'skl-5', name: 'Power BI', level: 4 },
        { id: 'skl-6', name: 'SQL', level: 3 },
        { id: 'skl-7', name: 'SAP FICO', level: 4 },
        { id: 'skl-8', name: 'IFRS and Ind AS', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Hindi', level: 'Native / Bilingual' },
        { id: 'lng-3', name: 'Tamil', level: 'Conversational' },
      ],
      certifications: [
        {
          id: 'crt-1',
          name: 'CFA Level II Candidate',
          issuer: 'CFA Institute',
          date: '2024-05',
        },
        {
          id: 'crt-2',
          name: 'Financial Modelling and Valuation Analyst (FMVA)',
          issuer: 'Corporate Finance Institute',
          date: '2021-07',
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
          'Growth marketer with 7 years running acquisition and lifecycle for subscription businesses. Comfortable in the ad account and in the analytics warehouse, and unusually happy to turn off a channel that is not paying for itself.',
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
            'Run a ₹9 crore annual budget across paid search, paid social, SEO and lifecycle; team of 5 plus two agencies.\nGrew qualified pipeline 2.4x in 18 months while holding blended CAC flat.\nRebuilt organic search around 40 intent-led pages, taking non-brand traffic from 22k to 91k sessions a month.\nCut trial-to-paid drop-off by 17% with a five-email lifecycle sequence built on product usage rather than time delay.\nReplaced last-click reporting with a multi-touch model that ended a two-year argument about channel credit.',
        },
        {
          id: 'exp-2',
          role: 'Performance Marketing Specialist',
          company: 'Halcyon Retail',
          location: 'Mumbai',
          start: '2018',
          end: '2022',
          bullets:
            'Scaled paid acquisition from ₹40 lakh to ₹5.6 crore annual spend at a 3.8x blended ROAS.\nRan 60+ creative tests a year and built the brief template the studio still works from.\nLaunched the referral programme that now accounts for 11% of new customers.',
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
            'A working guide to multi-touch attribution for teams without a data scientist. 3,100 monthly readers.',
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
        { id: 'skl-8', name: 'Copywriting', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Hindi', level: 'Native / Bilingual' },
        { id: 'lng-3', name: 'Gujarati', level: 'Native / Bilingual' },
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
            'Rebuilt the onboarding flow, lifting activation from 34% to 61% in two quarters.\nEstablished the design system now used by 4 product teams and 30+ engineers.\nRan a quarterly research cadence that shifted the 2024 roadmap away from two planned features.\nTook the core product to WCAG 2.1 AA, closing 140 audit findings across 9 months.',
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
          'Critical care nurse with 8 years in tertiary ICUs, including 3 as charge nurse on a 22-bed unit. Ventilator and post-surgical management, family communication under pressure, and a standing interest in the quality work that keeps preventable events off the ward.',
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
            'Lead a shift team of 9 nurses across a 22-bed medical ICU with a 1:2 acuity ratio.\nCo-led the CLABSI reduction bundle that took central-line infections from 2.4 to 0.6 per 1,000 line-days over 18 months.\nPrecept 4 to 6 new graduate nurses a year through the unit’s 12-week critical care orientation.\nSit on the hospital rapid response committee and review every unplanned ICU readmission.',
        },
        {
          id: 'exp-2',
          role: 'Staff Nurse, Surgical ICU',
          company: 'Amrita Institute of Medical Sciences',
          location: 'Kochi',
          start: '2017',
          end: '2021',
          bullets:
            'Managed post-operative cardiac and neurosurgical patients including ventilator weaning and vasoactive titration.\nServed as super-user for the EMR rollout, training 60+ nursing staff across three units.\nRecognised twice by the nursing directorate for family communication during end-of-life care.',
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
          note: 'Dissertation on early mobilisation protocols in ventilated patients.',
        },
        {
          id: 'edu-2',
          degree: 'B.Sc. Nursing',
          school: 'Government College of Nursing',
          location: 'Kottayam',
          start: '2012',
          end: '2016',
          note: 'First class.',
        },
      ],
      projects: [
        {
          id: 'prj-1',
          name: 'Early Mobilisation Pathway',
          link: '',
          description:
            'Designed and piloted a nurse-led mobilisation pathway for ventilated patients; median ICU length of stay on the pilot cohort fell by 1.4 days.',
          tech: 'Quality improvement, PDSA cycles',
        },
      ],
      skills: [
        { id: 'skl-1', name: 'Critical care nursing', level: 5 },
        { id: 'skl-2', name: 'Ventilator management', level: 5 },
        { id: 'skl-3', name: 'Haemodynamic monitoring', level: 5 },
        { id: 'skl-4', name: 'Care planning and documentation', level: 5 },
        { id: 'skl-5', name: 'Patient and family education', level: 5 },
        { id: 'skl-6', name: 'Infection prevention', level: 4 },
        { id: 'skl-7', name: 'Preceptorship and training', level: 4 },
        { id: 'skl-8', name: 'EMR (Cerner, Epic)', level: 4 },
      ],
      languages: [
        { id: 'lng-1', name: 'English', level: 'Native / Bilingual' },
        { id: 'lng-2', name: 'Malayalam', level: 'Native / Bilingual' },
        { id: 'lng-3', name: 'Hindi', level: 'Professional Working' },
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
        {
          id: 'crt-3',
          name: 'Basic Life Support (BLS)',
          issuer: 'American Heart Association',
          date: 'Valid to 2026-08',
        },
        {
          id: 'crt-4',
          name: 'Critical Care Registered Nurse (CCRN)',
          issuer: 'AACN',
          date: '2022-09',
        },
      ],
      publications: [
        {
          id: 'pub-1',
          title: 'Nurse-led early mobilisation in a tertiary medical ICU: an 18-month review',
          meta: 'Indian Journal of Critical Care Nursing, 2024',
        },
      ],
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

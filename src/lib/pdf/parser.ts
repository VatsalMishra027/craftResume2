import type {
  CertificationItem,
  EducationItem,
  ExperienceItem,
  InterestItem,
  LanguageItem,
  ProjectItem,
  PublicationItem,
  ResumeData,
  SectionKey,
  SkillItem,
} from '../types';
import { uid } from '../store';
import { EMPTY_RESUME } from '../sample';
import type {
  DetectedSectionStat,
  ExtractedSectionItem,
  ItemCategory,
  ParsedDocument,
  ParsedResumeResult,
  SectionConfidence,
  SourceLocation,
  TextBlock,
  TextLine,
  UnmappedSection,
} from './types';

// Regular expressions for contact and metadata
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE_REGEX =
  /(?:(?:\+?\d{1,3}[-.\s]*)?(?:\(?\d{2,5}\)?[-.\s]*)?\d{3,5}[-.\s]*\d{3,5}|\b\d{10}\b)/;
const LINKEDIN_REGEX =
  /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\u0080-\uFFFF-]+)/i;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i;
const URL_REGEX =
  /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,50}\.(?:com|org|net|dev|io|app|ai|me|co|in|tech|info|edu)\b(?:\/[^\s,]*)?/gi;

export const BULLET_START_REGEX =
  /^(?:[\s]*[•\*\▪\▫\►\✔\⁃\◦\·\●\○\◆\◇\■\□]|\s*[\u002D\u2010-\u2015\u2212]\s+|\s*(?:\d+[\.\)]|\(\d+\))\s+)/;

/**
 * Strips any leading bullet characters, list markers, or numbered prefixes from text.
 * Ensures stored item content does not carry bullet formatting that templates independently render.
 */
export function stripLeadingBullet(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();
  while (BULLET_START_REGEX.test(cleaned)) {
    cleaned = cleaned.replace(BULLET_START_REGEX, '').trim();
  }
  return cleaned;
}

// All Unicode dash variants: U+002D (hyphen), U+2010 to U+2015 (hyphens, en-dash, em-dash, horizontal bar), U+2212 (minus)
const DASH_PATTERN = '[\u002D\u2010-\u2015\u2212]';

// Clean date range regexes without char-class delimiter collision
const MONTH_NAMES =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE_PART = `(?:${MONTH_NAMES}\\s*\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`;
const DATE_DELIM = `(?:${DASH_PATTERN}|\\s+to\\s+)`;

const DATE_RANGE_REGEX = new RegExp(
  `\\b(${DATE_PART}\\s*${DATE_DELIM}\\s*(?:Present|Current|Now|${DATE_PART}))\\b`,
  'i',
);

const SINGLE_YEAR_REGEX = /\b(19\d{2}|20\d{2})\b/;

/** Comprehensive semantic aliases for all standard resume sections */
const SECTION_ALIASES: Record<string, SectionKey | 'summary' | 'unmapped'> = {
  // Experience
  experience: 'experience',
  'work experience': 'experience',
  'professional experience': 'experience',
  'employment history': 'experience',
  'work history': 'experience',
  internships: 'experience',
  'career history': 'experience',
  'relevant experience': 'experience',
  'professional background': 'experience',
  employment: 'experience',
  'mandates & engagements': 'experience',
  'practical experience': 'experience',

  // Education
  education: 'education',
  'academic background': 'education',
  academics: 'education',
  qualifications: 'education',
  'educational background': 'education',
  degrees: 'education',
  'education & qualifications': 'education',
  'scholastic record': 'education',
  'university education': 'education',
  'formal education': 'education',

  // Skills
  skills: 'skills',
  'technical skills': 'skills',
  technologies: 'skills',
  'core competencies': 'skills',
  'tech stack': 'skills',
  tools: 'skills',
  'tools & technologies': 'skills',
  proficiencies: 'skills',
  'key skills': 'skills',
  'areas of expertise': 'skills',
  'programming languages': 'skills',
  'tech competencies': 'skills',
  'technical proficiencies': 'skills',

  // Projects
  projects: 'projects',
  'personal projects': 'projects',
  'academic projects': 'projects',
  'key projects': 'projects',
  'selected projects': 'projects',
  'open source': 'projects',
  'open source contributions': 'projects',
  portfolio: 'projects',
  'software projects': 'projects',

  // Certifications
  certifications: 'certifications',
  certificates: 'certifications',
  licenses: 'certifications',
  'licenses & certifications': 'certifications',
  credentials: 'certifications',
  courses: 'certifications',
  accreditations: 'certifications',

  // Languages
  languages: 'languages',
  'language proficiency': 'languages',
  'known languages': 'languages',

  // Publications
  publications: 'publications',
  research: 'publications',
  papers: 'publications',
  patents: 'publications',
  talks: 'publications',
  'conference presentations': 'publications',

  // Interests
  interests: 'interests',
  hobbies: 'interests',
  activities: 'interests',
  'extracurricular activities': 'interests',

  // Summary
  summary: 'summary',
  'professional summary': 'summary',
  'executive summary': 'summary',
  'about me': 'summary',
  profile: 'summary',
  'personal profile': 'summary',
  objective: 'summary',
  'career objective': 'summary',

  // Known custom headings that map into unmapped with intelligent suggestedCategory
  awards: 'unmapped',
  honors: 'unmapped',
  achievements: 'unmapped',
  'awards & honors': 'unmapped',
  'honors & awards': 'unmapped',
  volunteering: 'unmapped',
  'volunteer work': 'unmapped',
  'volunteer experience': 'unmapped',
  leadership: 'unmapped',
  'community involvement': 'unmapped',
  'board memberships': 'unmapped',
  'patents & inventions': 'unmapped',
};

interface SemanticSectionBlock {
  key: SectionKey | 'summary' | 'unmapped';
  rawHeading: string;
  headingConfidence: 'high' | 'medium' | 'low';
  headingLine?: TextLine;
  lines: TextLine[];
}

/**
 * Stage B: Semantic resume parsing pipeline.
 * Converts ParsedDocument -> ResumeData with confidence, source tracking, and unmapped preservation.
 */
export function parseResume(doc: ParsedDocument): ParsedResumeResult {
  const resultData: ResumeData = structuredClone(EMPTY_RESUME);
  const confidence: Record<string, SectionConfidence> = {};
  const sourceMapping: Record<string, SourceLocation> = {};
  const unmappedSections: UnmappedSection[] = [];

  const { avgFontSize, headingThreshold } = doc.typographyMetadata;
  const lines = doc.allLines;

  // 1. Detect sections using multi-signal scoring
  const { headerLines, sections } = segmentDocumentSections(lines, avgFontSize, headingThreshold);

  // 2. Parse Personal Information & Header
  parseBasics(headerLines, resultData, confidence, sourceMapping);

  // 3. Parse Detected Sections
  for (const section of sections) {
    switch (section.key) {
      case 'summary':
        parseSummary(section, resultData, confidence, sourceMapping);
        break;

      case 'experience':
        parseExperience(section, resultData, confidence, sourceMapping);
        break;

      case 'education':
        parseEducation(section, resultData, confidence, sourceMapping);
        break;

      case 'skills':
        parseSkills(section, resultData, confidence, sourceMapping);
        break;

      case 'projects':
        parseProjects(section, resultData, confidence, sourceMapping);
        break;

      case 'certifications':
        parseCertifications(section, resultData, confidence, sourceMapping);
        break;

      case 'languages':
        parseLanguages(section, resultData, confidence, sourceMapping);
        break;

      case 'publications':
        parsePublications(section, resultData, confidence, sourceMapping);
        break;

      case 'interests':
        parseInterests(section, resultData, confidence, sourceMapping);
        break;

      case 'unmapped':
        handleUnmappedSection(section, unmappedSections, resultData, sourceMapping);
        break;
    }
  }

  // Ensure all standard section keys have an explicit confidence score
  const standardSections: SectionKey[] = [
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'languages',
    'publications',
    'interests',
  ];

  for (const key of standardSections) {
    if (!confidence[key]) {
      confidence[key] = (resultData[key] && resultData[key].length > 0) ? 'high' : 'low';
    }
  }

  if (!confidence['basics.summary']) {
    confidence['basics.summary'] = resultData.basics.summary ? 'high' : 'low';
  }

  // Count fields needing review
  let needsReviewCount = 0;
  Object.values(confidence).forEach((c) => {
    if (c === 'low' || c === 'medium') needsReviewCount += 1;
  });
  needsReviewCount += unmappedSections.length;

  // Compute detailed section statistics tracking item counts and items for all detected sections
  const sectionStats: DetectedSectionStat[] = sections.map((sec) => {
    if (sec.key === 'unmapped') {
      const unm = unmappedSections.find((u) => u.rawHeading === sec.rawHeading);
      return {
        heading: sec.rawHeading,
        sectionKey: sec.key,
        itemCount: unm?.itemCount ?? sec.lines.length,
        items: unm?.items ?? extractSectionItems(sec.lines, sec.rawHeading),
      };
    }

    const items = extractSectionItems(sec.lines, sec.rawHeading);
    return {
      heading: sec.rawHeading,
      sectionKey: sec.key,
      itemCount: items.length,
      items,
    };
  });

  return {
    data: resultData,
    confidence,
    sourceMapping,
    unmappedSections,
    stats: {
      pagesCount: doc.pages.length,
      detectedSections: sections.map((s) => s.rawHeading),
      sectionStats,
      experienceCount: resultData.experience.length,
      educationCount: resultData.education.length,
      skillsCount: resultData.skills.length,
      projectsCount: resultData.projects.length,
      unmappedCount: unmappedSections.length,
      needsReviewCount,
    },
  };
}

/**
 * Segments lines into header and sections using multi-signal heading detection.
 */
function segmentDocumentSections(
  lines: TextLine[],
  avgFontSize: number,
  headingThreshold: number,
): { headerLines: TextLine[]; sections: SemanticSectionBlock[] } {
  const headerLines: TextLine[] = [];
  const sections: SemanticSectionBlock[] = [];

  let currentBlock: SemanticSectionBlock | null = null;
  let seenFirstKnownSection = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : undefined;

    // Filter out obvious header/footer noise (e.g. "Page 2", "John Doe — Page 2")
    if (isPageNumberOrHeaderNoise(line.text)) {
      continue;
    }

    const headingCandidate = evaluateHeadingSignals(
      line,
      prevLine,
      avgFontSize,
      headingThreshold,
      seenFirstKnownSection,
    );

    if (headingCandidate) {
      if (headingCandidate.key !== 'unmapped') {
        seenFirstKnownSection = true;
      }
      if (currentBlock) {
        sections.push(currentBlock);
      }
      currentBlock = {
        key: headingCandidate.key,
        rawHeading: line.text,
        headingConfidence: headingCandidate.confidence,
        headingLine: line,
        lines: [],
      };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    } else {
      headerLines.push(line);
    }
  }

  if (currentBlock) {
    sections.push(currentBlock);
  }

  return { headerLines, sections };
}

function isPageNumberOrHeaderNoise(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /^page\s*\d+(\s*of\s*\d+)?$/i.test(t) ||
    /[-–—]\s*page\s*\d+$/i.test(t) ||
    /^page\s*\d+\s*[-–—]/i.test(t)
  );
}

/**
 * Evaluates composite signals (typography, casing, geometry, dictionary, brevity).
 */
function evaluateHeadingSignals(
  line: TextLine,
  prevLine: TextLine | undefined,
  avgFontSize: number,
  headingThreshold: number,
  seenFirstKnownSection: boolean,
): { key: SectionKey | 'summary' | 'unmapped'; confidence: 'high' | 'medium' | 'low' } | null {
  const text = line.text.trim();
  const clean = text.toLowerCase().replace(/[:\-_—=]+$/, '').trim();

  // Reject lines containing emails, URLs, dates, or full sentences
  if (
    EMAIL_REGEX.test(text) ||
    text.includes('http') ||
    text.includes('.com') ||
    DATE_RANGE_REGEX.test(text) ||
    text.split(/\s+/).length > 5 ||
    text.length > 40
  ) {
    return null;
  }

  // Reject common degree phrases like "Ph.D. in Operations Research"
  if (/^(ph\.?d|bachelor|master|b\.s\.|m\.s\.|mba|b\.tech)\b/i.test(clean)) {
    return null;
  }

  let score = 0;

  // Signal 1: Exact or Prefix Dictionary Match
  let matchedKey: SectionKey | 'summary' | 'unmapped' | null = null;
  if (SECTION_ALIASES[clean]) {
    matchedKey = SECTION_ALIASES[clean];
    score += 50;
  } else {
    for (const [alias, key] of Object.entries(SECTION_ALIASES)) {
      if (
        clean === alias ||
        clean === `my ${alias}` ||
        clean === `key ${alias}` ||
        clean === `selected ${alias}` ||
        clean === `technical ${alias}`
      ) {
        matchedKey = key;
        score += 45;
        break;
      }
    }
  }

  // Signal 2: Typography (Font Size & Weight)
  if (line.maxFontSize >= headingThreshold) {
    score += 25;
  } else if (line.maxFontSize > avgFontSize * 1.05) {
    score += 15;
  }

  const isBoldFont = line.items.some((it) => /bold|black|heavy|semibold/i.test(it.fontName));
  if (isBoldFont) score += 15;

  // Signal 3: All-Caps
  if (line.isAllUpper && text.length >= 3 && text.length <= 40) {
    score += 20;
  }

  // Signal 4: Vertical Geometry / Spacing
  if (line.spacingBefore >= 6 || (prevLine && prevLine.page !== line.page)) {
    score += 10;
  }

  // If matched a known section key with sufficient signal
  if (matchedKey && score >= 45) {
    return {
      key: matchedKey,
      confidence: score >= 65 ? 'high' : 'medium',
    };
  }

  // Unmapped heading candidate (only after header passed, must be all-upper or bold, score >= 55)
  if (seenFirstKnownSection && (line.isAllUpper || isBoldFont) && score >= 55) {
    return {
      key: 'unmapped',
      confidence: 'low',
    };
  }

  return null;
}

// =============================================================================
// PERSONAL INFORMATION & HEADER CLASSIFICATION CONSTANTS & SCORING
// =============================================================================

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const EMAIL_TOKEN_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const LEADING_ICON_OR_NOISE = /^[\u2700-\u27BF\uE000-\uF8FF\u2600-\u26FF\u{1F300}-\u{1F9FF}\u2709✉\s:;•·|/\\-]+/u;
const TRAILING_NOISE = /[\s:;•·|/\\,.]*$/;

const JOB_ROLE_KEYWORDS = new Set([
  'engineer', 'engineers', 'developer', 'developers', 'designer', 'designers',
  'architect', 'architects', 'consultant', 'consultants', 'analyst', 'analysts',
  'scientist', 'scientists', 'specialist', 'specialists', 'administrator',
  'administrators', 'officer', 'officers', 'coordinator', 'coordinators',
  'strategist', 'strategists', 'technologist', 'technologists', 'researcher',
  'researchers', 'programmer', 'programmers', 'manager', 'managers', 'lead',
  'leads', 'head', 'director', 'directors', 'vp', 'president', 'founder',
  'co-founder', 'partner', 'associate', 'associates', 'intern', 'interns',
  'practitioner', 'instructor', 'professor', 'advisor', 'auditor', 'creator',
  'editor', 'writer', 'producer', 'expert', 'assistant', 'fellow', 'planner',
]);

const JOB_DOMAIN_KEYWORDS = new Set([
  'software', 'frontend', 'front-end', 'backend', 'back-end', 'fullstack',
  'full-stack', 'web', 'mobile', 'ios', 'android', 'cloud', 'devops', 'sre',
  'reliability', 'data', 'database', 'ai', 'artificial', 'intelligence',
  'learning', 'nlp', 'vision', 'product', 'project', 'program', 'qa', 'quality',
  'assurance', 'security', 'cybersecurity', 'network', 'systems', 'platform',
  'infrastructure', 'ui', 'ux', 'ui/ux', 'graphic', 'visual', 'interaction',
  'creative', 'business', 'finance', 'marketing', 'operations', 'sales', 'hr',
  'content', 'legal', 'hardware', 'embedded', 'firmware', 'blockchain',
  'distributed', 'machine',
]);

const JOB_SENIORITY_KEYWORDS = new Set([
  'senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'staff', 'chief',
  'associate', 'intern', 'entry-level', 'graduate', 'trainee', 'distinguished',
]);

const RECOGNIZED_COUNTRIES = new Set([
  'india', 'usa', 'united states', 'us', 'u.s.', 'u.s.a.', 'uk', 'united kingdom',
  'u.k.', 'canada', 'australia', 'germany', 'france', 'japan', 'singapore',
  'netherlands', 'ireland', 'sweden', 'switzerland', 'brazil', 'spain', 'italy',
  'china', 'south korea', 'korea', 'uae', 'united arab emirates', 'new zealand',
  'israel', 'poland', 'mexico', 'taiwan', 'russia', 'norway', 'denmark',
  'finland', 'austria', 'belgium', 'south africa', 'portugal', 'greece',
  'turkey', 'saudi arabia', 'argentina', 'chile', 'colombia', 'malaysia',
  'thailand', 'vietnam', 'indonesia', 'philippines', 'pakistan', 'bangladesh',
  'egypt', 'nigeria', 'kenya',
]);

const RECOGNIZED_STATES = new Set([
  // US 2-letter codes
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il',
  'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt',
  'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri',
  'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc',
  // US state names
  'california', 'texas', 'new york', 'washington', 'illinois', 'massachusetts',
  'florida', 'colorado', 'georgia', 'virginia', 'ohio', 'michigan',
  'north carolina', 'pennsylvania', 'oregon', 'arizona', 'minnesota',
  // Indian states & UTs
  'uttar pradesh', 'karnataka', 'maharashtra', 'delhi', 'new delhi', 'tamil nadu',
  'telangana', 'gujarat', 'rajasthan', 'west bengal', 'haryana', 'punjab',
  'kerala', 'bihar', 'madhya pradesh', 'andhra pradesh', 'odisha', 'assam',
  'jharkhand', 'uttarakhand', 'himachal pradesh', 'goa', 'chandigarh',
  'jammu and kashmir', 'up', 'mp', 'ap', 'tn', 'wb', 'ka', 'mh', 'dl',
  // Canadian provinces
  'ontario', 'quebec', 'british columbia', 'alberta', 'manitoba', 'saskatchewan',
  'nova scotia', 'new brunswick', 'on', 'qc', 'bc', 'ab', 'mb',
]);

const RECOGNIZED_CITIES = new Set([
  // Major Indian cities
  'greater noida', 'noida', 'bengaluru', 'bangalore', 'mumbai', 'delhi',
  'new delhi', 'hyderabad', 'chennai', 'pune', 'kolkata', 'gurugram', 'gurgaon',
  'ahmedabad', 'jaipur', 'chandigarh', 'indore', 'lucknow', 'kanpur', 'kochi',
  'patna', 'bhopal', 'nagpur', 'vadodara', 'ghaziabad', 'ludhiana', 'agra',
  'nashik', 'varanasi',
  // Major US & Global cities
  'austin', 'san francisco', 'new york', 'seattle', 'chicago', 'boston',
  'los angeles', 'san jose', 'denver', 'atlanta', 'dallas', 'houston', 'toronto',
  'vancouver', 'london', 'berlin', 'munich', 'paris', 'amsterdam', 'dublin',
  'sydney', 'melbourne', 'tokyo', 'seoul', 'dubai', 'singapore', 'zurich',
  'stockholm', 'hong kong',
]);

const LOCATION_KEYWORDS = new Set([
  'remote', 'hybrid', 'on-site', 'relocating', 'greater', 'area', 'metro',
  'metropolitan', 'district', 'city', 'county', 'state', 'province', 'region',
]);

function evaluateJobTitleCandidate(
  text: string,
  isImmediatelyAfterName: boolean,
): { score: number; confidence: 'high' | 'medium' | 'low' } {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Outright rejections
  if (
    EMAIL_REGEX.test(clean) ||
    PHONE_REGEX.test(clean) ||
    URL_REGEX.test(clean) ||
    clean.includes('@') ||
    clean.includes('http') ||
    clean.includes('.com') ||
    BULLET_START_REGEX.test(clean) ||
    DATE_RANGE_REGEX.test(clean) ||
    SINGLE_YEAR_REGEX.test(clean) ||
    clean.length < 2 ||
    clean.length > 70
  ) {
    return { score: 0, confidence: 'low' };
  }

  // Reject action verbs or sentences ending with period/exclamation
  if (
    /[.!?]$/.test(clean) ||
    /^(developed|managed|spearheaded|engineered|architected|built|led|designed|created)\b/i.test(clean)
  ) {
    return { score: 0, confidence: 'low' };
  }

  const words = lower.split(/[\s/\\-]+/).filter(Boolean);
  if (words.length > 8) {
    return { score: 0, confidence: 'low' };
  }

  let score = 0;

  // Signal 1: Role / domain / seniority vocabulary
  let roleCount = 0;
  let domainCount = 0;
  let seniorityCount = 0;

  for (const w of words) {
    if (JOB_ROLE_KEYWORDS.has(w)) roleCount += 1;
    if (JOB_DOMAIN_KEYWORDS.has(w)) domainCount += 1;
    if (JOB_SENIORITY_KEYWORDS.has(w)) seniorityCount += 1;
  }

  if (roleCount > 0) score += 45;
  if (roleCount > 1) score += 15;
  if (domainCount > 0) score += 20;
  if (seniorityCount > 0) score += 15;

  // Signal 2: Length & phrase structure
  if (words.length >= 1 && words.length <= 4) {
    score += 20;
  } else if (words.length <= 6) {
    score += 10;
  }

  // Signal 3: Position
  if (isImmediatelyAfterName) {
    score += 15;
  }

  // Signal 4: Casing
  const isTitleCase = /^[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*|\s+(?:and|of|in|for|&)\s+[A-Z][a-zA-Z]*)*$/.test(clean);
  const isUpper = clean === clean.toUpperCase() && /[A-Z]/.test(clean);
  if (isTitleCase || isUpper) {
    score += 10;
  }

  // Negative Signal: Geographic structure & commas
  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim().toLowerCase());
    let geoPartCount = 0;
    for (const p of parts) {
      if (RECOGNIZED_COUNTRIES.has(p) || RECOGNIZED_STATES.has(p) || RECOGNIZED_CITIES.has(p)) {
        geoPartCount += 1;
      }
    }
    if (geoPartCount > 0) {
      score -= 60;
    } else {
      score -= 30;
    }
  }

  // Negative Signal: Digits
  if (/\d/.test(clean)) {
    if (!/\b[23]d\b/i.test(clean) && !/\b(?:level|tier|l|e)\s*\d\b/i.test(clean)) {
      score -= 40;
    }
  }

  const confidence: 'high' | 'medium' | 'low' =
    score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';

  return { score: Math.max(0, score), confidence };
}

function evaluateLocationCandidate(
  text: string,
): { score: number; confidence: 'high' | 'medium' | 'low' } {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Outright rejections
  if (
    EMAIL_REGEX.test(clean) ||
    clean.includes('@') ||
    clean.includes('http') ||
    clean.includes('.com') ||
    BULLET_START_REGEX.test(clean) ||
    DATE_RANGE_REGEX.test(clean) ||
    clean.length < 2 ||
    clean.length > 80
  ) {
    return { score: 0, confidence: 'low' };
  }

  // Negative signal: Job title role keywords (e.g. "Software Engineer")
  const words = lower.split(/[\s,./\\-]+/).filter(Boolean);
  let jobKeywordCount = 0;
  for (const w of words) {
    if (JOB_ROLE_KEYWORDS.has(w)) jobKeywordCount += 1;
  }
  if (jobKeywordCount > 0) {
    return { score: 0, confidence: 'low' };
  }

  let score = 0;

  // Signal 1: Comma-separated structure (City, State, Country or City, State or City, Country)
  const commaParts = clean.split(',').map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2 && commaParts.length <= 4) {
    score += 35;
  }

  // Signal 2: Recognized geographic tokens
  let geoTokenMatches = 0;
  for (const part of commaParts) {
    const pLower = part.toLowerCase();
    if (
      RECOGNIZED_COUNTRIES.has(pLower) ||
      RECOGNIZED_STATES.has(pLower) ||
      RECOGNIZED_CITIES.has(pLower)
    ) {
      geoTokenMatches += 1;
    }
  }

  for (const city of RECOGNIZED_CITIES) {
    if (lower.includes(city)) {
      geoTokenMatches += 1;
      break;
    }
  }
  for (const country of RECOGNIZED_COUNTRIES) {
    if (lower.includes(country)) {
      geoTokenMatches += 1;
      break;
    }
  }
  for (const state of RECOGNIZED_STATES) {
    const stateRegex = new RegExp(`\\b${state}\\b`, 'i');
    if (stateRegex.test(lower)) {
      geoTokenMatches += 1;
      break;
    }
  }
  for (const kw of LOCATION_KEYWORDS) {
    if (lower.includes(kw)) {
      score += 15;
      break;
    }
  }

  if (geoTokenMatches >= 2) {
    score += 50;
  } else if (geoTokenMatches === 1) {
    score += 35;
  }

  // Signal 3: Standard US "City, ST" regex or ZIP code pattern
  if (/\b[A-Z][a-zA-Z\s.-]+,\s*[A-Z]{2}(?:\s+\d{5})?\b/.test(clean)) {
    score += 30;
  }

  // Signal 4: Clean phrase length
  if (words.length >= 1 && words.length <= 6) {
    score += 15;
  } else if (words.length > 8 && commaParts.length < 2) {
    score -= 30;
  }

  const confidence: 'high' | 'medium' | 'low' =
    score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';

  return { score: Math.max(0, score), confidence };
}

const ICON_FONT_REGEX = /icon|symbol|dingbat|wingding|webding|awesome|glyph|socicon|fontello|icomoon/i;
const UNICODE_ICON_REGEX = /[\u2700-\u27BF\uE000-\uF8FF\u2600-\u26FF\u{1F300}-\u{1F9FF}\u2709✉]/u;

function isIconOrGlyphFragment(frag: TextFragment): boolean {
  if (frag.fontName && ICON_FONT_REGEX.test(frag.fontName)) {
    return true;
  }
  const t = frag.text.trim();
  if (UNICODE_ICON_REGEX.test(t)) {
    return true;
  }
  return false;
}

interface EmailExtractionResult {
  email: string;
  confidence: SectionConfidence;
  sourceLine?: TextLine;
}

/**
 * Robust, fragment-aware email extraction preventing icon/glyph corruption.
 * Only treats characters as icon/glyph fragments when supported by font metadata,
 * Unicode category, or strong contextual fragment evidence.
 */
function extractEmail(lines: TextLine[], allText: string): EmailExtractionResult {
  interface Candidate {
    email: string;
    sourceLine?: TextLine;
    score: number;
  }

  const candidates: Candidate[] = [];

  function addCandidate(raw: string, line: TextLine | undefined, baseScore: number) {
    if (!raw) return;
    const clean = raw.trim().replace(LEADING_ICON_OR_NOISE, '').replace(TRAILING_NOISE, '');
    if (STRICT_EMAIL_REGEX.test(clean)) {
      const existing = candidates.find((c) => c.email.toLowerCase() === clean.toLowerCase());
      if (existing) {
        existing.score = Math.max(existing.score, baseScore);
        if (!existing.sourceLine && line) existing.sourceLine = line;
      } else {
        candidates.push({ email: clean, sourceLine: line, score: baseScore });
      }
    }
  }

  for (const line of lines) {
    const items = line.items || [];
    if (items.length > 0) {
      // 1a. Check individual fragments
      for (let i = 0; i < items.length; i += 1) {
        const frag = items[i];
        // If the fragment itself is identified as an icon/glyph, skip treating it as email
        if (isIconOrGlyphFragment(frag)) {
          continue;
        }

        const text = frag.text.trim();
        if (STRICT_EMAIL_REGEX.test(text)) {
          addCandidate(text, line, 100);
        } else {
          const stripped = text.replace(LEADING_ICON_OR_NOISE, '').replace(TRAILING_NOISE, '');
          if (STRICT_EMAIL_REGEX.test(stripped)) {
            addCandidate(stripped, line, 95);
          }
        }
      }

      // 1b. Check contiguous multi-fragment combinations
      for (let s = 0; s < items.length; s += 1) {
        const currentFrag = items[s];
        const isIcon = isIconOrGlyphFragment(currentFrag);
        const nextFrag = s + 1 < items.length ? items[s + 1] : undefined;
        const isIsolated1CharGlyph =
          currentFrag.text.trim().length === 1 &&
          nextFrag &&
          (currentFrag.fontName !== nextFrag.fontName || isIcon);

        // Do not start an email candidate on an icon/glyph fragment
        if (isIcon || isIsolated1CharGlyph) {
          continue;
        }

        let accText = '';
        for (let e = s; e < Math.min(items.length, s + 8); e += 1) {
          accText += items[e].text;
          const trimmed = accText.trim();
          const clean = trimmed.replace(LEADING_ICON_OR_NOISE, '').replace(TRAILING_NOISE, '');
          if (STRICT_EMAIL_REGEX.test(clean)) {
            addCandidate(clean, line, 85);
          }
        }
      }
    }

    // 1c. Line text fallback
    const matches = line.text.match(EMAIL_TOKEN_REGEX);
    if (matches) {
      for (const m of matches) {
        addCandidate(m, line, 80);
      }
    }
  }

  // 2. Global allText fallback
  if (candidates.length === 0) {
    const globalMatches = allText.match(EMAIL_TOKEN_REGEX);
    if (globalMatches) {
      for (const m of globalMatches) {
        addCandidate(m, undefined, 70);
      }
    }
  }

  // If multiple candidates exist, verify whether one is corrupted by an adjacent icon fragment
  if (candidates.length > 1) {
    const filtered = candidates.filter((cand) => {
      return !candidates.some((other) => {
        if (cand.email.toLowerCase() === other.email.toLowerCase()) return false;
        if (
          cand.email.length === other.email.length + 1 &&
          cand.email.toLowerCase().endsWith(other.email.toLowerCase())
        ) {
          const prefixChar = cand.email[0];
          const line = cand.sourceLine || other.sourceLine;
          if (line && line.items) {
            const hasIconPrefix = line.items.some(
              (it) =>
                it.text.trim() === prefixChar &&
                (isIconOrGlyphFragment(it) || it.fontName !== line.items[line.items.indexOf(it) + 1]?.fontName),
            );
            if (hasIconPrefix) return true;
          }
        }
        return false;
      });
    });

    if (filtered.length > 0) {
      candidates.length = 0;
      candidates.push(...filtered);
    }
  }

  if (candidates.length === 0) {
    return { email: '', confidence: 'low' };
  }

  candidates.sort((a, b) => b.score - a.score);

  const uniqueEmails = Array.from(new Set(candidates.map((c) => c.email.toLowerCase())));
  if (uniqueEmails.length === 1) {
    return {
      email: candidates[0].email,
      confidence: candidates[0].score >= 80 ? 'high' : 'medium',
      sourceLine: candidates[0].sourceLine,
    };
  }

  return {
    email: candidates[0].email,
    confidence: 'medium',
    sourceLine: candidates[0].sourceLine,
  };
}

/**
 * Parses header block for Name, Title, Contact Info, and Links.
 */
function parseBasics(
  lines: TextLine[],
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const allText = lines.map((l) => l.text).join(' \n ');

  // 1. Exact Email Extraction
  const emailResult = extractEmail(lines, allText);
  data.basics.email = emailResult.email;
  confidence['basics.email'] = emailResult.confidence;
  if (emailResult.sourceLine && emailResult.email) {
    sourceMapping['basics.email'] = {
      page: emailResult.sourceLine.page,
      blockId: emailResult.sourceLine.id,
      rawText: emailResult.sourceLine.text,
    };
  }

  // 2. Phone
  const phoneMatch = allText.match(PHONE_REGEX);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) {
    data.basics.phone = phoneMatch[0].trim();
    confidence['basics.phone'] = 'high';
    const sourceLine = lines.find((l) => l.text.includes(phoneMatch[0]));
    if (sourceLine) {
      sourceMapping['basics.phone'] = {
        page: sourceLine.page,
        blockId: sourceLine.id,
        rawText: sourceLine.text,
      };
    }
  } else {
    data.basics.phone = '';
    confidence['basics.phone'] = 'medium';
  }

  // 3. LinkedIn
  const linkedinMatch = allText.match(LINKEDIN_REGEX);
  if (linkedinMatch) {
    data.basics.linkedin = linkedinMatch[0].replace(/^https?:\/\//i, '');
    confidence['basics.linkedin'] = 'high';
  }

  // 4. GitHub
  const githubMatch = allText.match(GITHUB_REGEX);
  if (githubMatch) {
    data.basics.github = githubMatch[0].replace(/^https?:\/\//i, '');
    confidence['basics.github'] = 'high';
  }

  // 5. Website / Portfolio (excluding linkedin and github)
  const urlMatches = allText.match(URL_REGEX) || [];
  for (const url of urlMatches) {
    if (
      !url.includes('linkedin.com') &&
      !url.includes('github.com') &&
      !url.includes('@') &&
      (!data.basics.email || !data.basics.email.toLowerCase().includes(url.toLowerCase()))
    ) {
      data.basics.website = url.replace(/^https?:\/\//i, '');
      break;
    }
  }

  // 6. Full Name from top lines
  let nameFound = false;
  let nameLineIndex = -1;

  for (let i = 0; i < Math.min(lines.length, 5); i += 1) {
    const line = lines[i];
    const text = line.text.trim();

    if (
      EMAIL_REGEX.test(text) ||
      PHONE_REGEX.test(text) ||
      URL_REGEX.test(text) ||
      text.includes('@') ||
      BULLET_START_REGEX.test(text)
    ) {
      continue;
    }

    const words = text.split(/\s+/);
    if (!nameFound && words.length >= 1 && words.length <= 5 && !/[0-9]/.test(text)) {
      const jobEval = evaluateJobTitleCandidate(text, false);
      const locEval = evaluateLocationCandidate(text);
      if (jobEval.confidence !== 'high' && locEval.confidence !== 'high') {
        data.basics.fullName = text;
        nameFound = true;
        nameLineIndex = i;
        confidence['basics.fullName'] = 'high';
        sourceMapping['basics.fullName'] = {
          page: line.page,
          blockId: line.id,
          rawText: text,
        };
        break;
      }
    }
  }

  if (!nameFound) {
    if (data.basics.email) {
      data.basics.fullName = data.basics.email
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } else {
      data.basics.fullName = '';
    }
    confidence['basics.fullName'] = 'low';
  }

  // 7. Multi-Signal Independent Classification for Job Title & Location
  let titleFound = false;
  let locationFound = false;

  const startIndex = nameLineIndex >= 0 ? nameLineIndex + 1 : 0;
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    const text = line.text.trim();
    if (!text) continue;

    const isImmediatelyAfterName = (i === nameLineIndex + 1);
    const hasContact =
      EMAIL_REGEX.test(text) ||
      PHONE_REGEX.test(text) ||
      URL_REGEX.test(text) ||
      text.includes('@');

    if (!hasContact) {
      const jobScore = evaluateJobTitleCandidate(text, isImmediatelyAfterName);
      const locScore = evaluateLocationCandidate(text);

      // Compare candidate scores independently
      if (!titleFound && jobScore.score >= 45 && jobScore.score > locScore.score) {
        data.basics.title = text;
        titleFound = true;
        confidence['basics.title'] = jobScore.confidence;
        sourceMapping['basics.title'] = {
          page: line.page,
          blockId: line.id,
          rawText: text,
        };
        continue;
      }

      if (!locationFound && locScore.score >= 40 && locScore.score > jobScore.score) {
        data.basics.location = text;
        locationFound = true;
        confidence['basics.location'] = locScore.confidence;
        sourceMapping['basics.location'] = {
          page: line.page,
          blockId: line.id,
          rawText: text,
        };
        continue;
      }
    } else {
      // Line contains contact info: check for an inline location segment
      if (!locationFound) {
        const segments = text.split(/[\s]*[·|•][\s]*/).map((s) => s.trim()).filter(Boolean);
        for (const seg of segments) {
          if (
            EMAIL_REGEX.test(seg) ||
            PHONE_REGEX.test(seg) ||
            URL_REGEX.test(seg) ||
            seg.includes('@')
          ) {
            continue;
          }
          const locScore = evaluateLocationCandidate(seg);
          if (locScore.score >= 35) {
            data.basics.location = seg;
            locationFound = true;
            confidence['basics.location'] = locScore.confidence;
            sourceMapping['basics.location'] = {
              page: line.page,
              blockId: line.id,
              rawText: seg,
            };
            break;
          }
        }
      }
    }
  }

  // Fallback: check allText for recognized location format if not found yet
  if (!locationFound) {
    const locRegex = /([A-Z][a-zA-Z\s.-]+,\s*[A-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)?)/;
    const locMatch = allText.match(locRegex);
    if (locMatch && !locMatch[1].includes('@') && !locMatch[1].includes('http')) {
      const locScore = evaluateLocationCandidate(locMatch[1]);
      if (locScore.score >= 35) {
        data.basics.location = locMatch[1].trim();
        locationFound = true;
        confidence['basics.location'] = 'medium';
      }
    }
  }

  if (!titleFound) {
    data.basics.title = '';
    confidence['basics.title'] = 'low';
  }

  if (!locationFound) {
    data.basics.location = '';
    confidence['basics.location'] = 'low';
  }
}

/**
 * Parses professional summary without altering original wording.
 */
function parseSummary(
  section: SemanticSectionBlock,
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const text = section.lines
    .map((l) => l.text.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  data.basics.summary = text;
  confidence['basics.summary'] = text ? 'high' : 'low';

  if (section.headingLine) {
    sourceMapping['basics.summary'] = {
      page: section.headingLine.page,
      blockId: section.headingLine.id,
      rawText: text,
    };
  }
}

/**
 * Parses work experience into structured ExperienceItem[] preserving exact wording and bullets.
 */
function parseExperience(
  section: SemanticSectionBlock,
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const items: ExperienceItem[] = [];
  let currentItem: Partial<ExperienceItem> | null = null;
  const bulletLines: string[] = [];

  function finalizeExp(): void {
    if (currentItem && (currentItem.role || currentItem.company || bulletLines.length)) {
      items.push({
        id: uid('exp'),
        role: currentItem.role || '',
        company: currentItem.company || '',
        location: currentItem.location || '',
        start: currentItem.start || '',
        end: currentItem.end || '',
        bullets: bulletLines.join('\n').trim(),
      });
      currentItem = null;
      bulletLines.length = 0;
    }
  }

  for (const line of section.lines) {
    const text = line.text.trim();
    if (!text) continue;

    const dateMatch = text.match(DATE_RANGE_REGEX);
    const isBullet = BULLET_START_REGEX.test(text);

    // 1. Line has date range
    if (dateMatch && !isBullet) {
      const { start, end } = extractStartEnd(dateMatch[0]);
      const restOfLine = text.replace(dateMatch[0], '').replace(/[|•,·\u002D\u2010-\u2015\u2212]+$/, '').trim();

      if (currentItem && !currentItem.start && !currentItem.end) {
        currentItem.start = start;
        currentItem.end = end;
        if (restOfLine) {
          if (!currentItem.company) {
            currentItem.company = restOfLine;
          } else if (!currentItem.location) {
            currentItem.location = restOfLine;
          }
        }
        continue;
      }

      finalizeExp();

      currentItem = { start, end };
      if (restOfLine) {
        const parts = splitRoleAndCompany(restOfLine);
        currentItem.role = parts.role;
        currentItem.company = parts.company;
      }
      continue;
    }

    // 2. Line looks like a new role / company heading
    const hasSeparator = /[\s\u002D\u2010-\u2015\u2212|·•]/.test(text) && (text.includes(' | ') || text.includes(' - ') || text.includes(' — ') || text.includes(' · ') || text.includes(' at '));
    const isRoleHint = isJobTitleHint(text);

    if (!isBullet && (hasSeparator || isRoleHint || line.isAllUpper || line.maxFontSize >= 11)) {
      if (currentItem && (currentItem.start || bulletLines.length > 0)) {
        finalizeExp();
      }
      if (!currentItem) {
        const parts = splitRoleAndCompany(text);
        currentItem = {
          role: parts.role,
          company: parts.company,
        };
        continue;
      }
    }

    // 3. Bullet / Achievement line
    const cleaned = text.replace(BULLET_START_REGEX, '').trim();
    if (cleaned) {
      if (isBullet || bulletLines.length === 0) {
        bulletLines.push(cleaned);
      } else {
        bulletLines[bulletLines.length - 1] += ' ' + cleaned;
      }
    }
  }

  finalizeExp();

  data.experience = items;
  confidence['experience'] = items.length > 0 ? 'high' : 'low';

  if (section.headingLine) {
    sourceMapping['experience'] = {
      page: section.headingLine.page,
      blockId: section.headingLine.id,
      rawText: section.rawHeading,
    };
  }
}

function splitRoleAndCompany(text: string): { role: string; company: string } {
  const separators = [' | ', ' · ', ' • ', ' — ', ' – ', ' at ', ' - '];
  for (const sep of separators) {
    if (text.includes(sep)) {
      const [p1, p2] = text.split(sep).map((s) => s.trim());
      if (isJobTitleHint(p1)) {
        return { role: p1, company: p2 };
      }
      return { role: p2, company: p1 };
    }
  }

  return { role: text, company: '' };
}

function isJobTitleHint(str: string): boolean {
  return /engineer|developer|designer|manager|lead|director|intern|analyst|architect|consultant|specialist|officer|head/i.test(
    str,
  );
}

function extractStartEnd(dateStr: string): { start: string; end: string } {
  const parts = dateStr.split(/\s*(?:[\u002D\u2010-\u2015\u2212]|\bto\b)\s*/i).map((s) => s.trim());
  if (parts.length >= 2) {
    return { start: parts[0], end: parts[1] };
  }
  return { start: dateStr, end: '' };
}

/**
 * Parses education section into structured EducationItem[].
 */
function parseEducation(
  section: SemanticSectionBlock,
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const items: EducationItem[] = [];
  let currentItem: Partial<EducationItem> | null = null;

  function finalizeEdu(): void {
    if (currentItem && (currentItem.degree || currentItem.school)) {
      items.push({
        id: uid('edu'),
        degree: currentItem.degree || '',
        school: currentItem.school || '',
        location: currentItem.location || '',
        start: currentItem.start || '',
        end: currentItem.end || '',
        note: currentItem.note || '',
      });
      currentItem = null;
    }
  }

  for (const line of section.lines) {
    const text = line.text.trim();
    if (!text) continue;

    const dateMatch = text.match(DATE_RANGE_REGEX) || text.match(SINGLE_YEAR_REGEX);

    if (dateMatch) {
      const { start, end } = extractStartEnd(dateMatch[0]);

      if (currentItem && !currentItem.start && !currentItem.end) {
        currentItem.start = start;
        currentItem.end = end;
        const rest = text.replace(dateMatch[0], '').replace(/[|•,·\u002D\u2010-\u2015\u2212]+$/, '').trim();
        if (rest && !currentItem.school) currentItem.school = rest;
        continue;
      }

      if (currentItem && (currentItem.degree || currentItem.school)) {
        finalizeEdu();
      }
      currentItem = currentItem || {};
      currentItem.start = start;
      currentItem.end = end;

      const rest = text.replace(dateMatch[0], '').replace(/[|•,·\u002D\u2010-\u2015\u2212]+$/, '').trim();
      if (rest) {
        if (isDegreeHint(rest)) {
          currentItem.degree = rest;
        } else {
          currentItem.school = rest;
        }
      }
      continue;
    }

    if (!currentItem) {
      currentItem = {};
    }

    if (!currentItem.degree && isDegreeHint(text)) {
      currentItem.degree = text;
    } else if (!currentItem.school && isSchoolHint(text)) {
      currentItem.school = text;
    } else if (!currentItem.note && /GPA|honors|distinction|major|minor/i.test(text)) {
      currentItem.note = text;
    } else if (!currentItem.degree) {
      currentItem.degree = text;
    } else if (!currentItem.school) {
      currentItem.school = text;
    }
  }

  finalizeEdu();

  data.education = items;
  confidence['education'] = items.length > 0 ? 'high' : 'low';

  if (section.headingLine) {
    sourceMapping['education'] = {
      page: section.headingLine.page,
      blockId: section.headingLine.id,
      rawText: section.rawHeading,
    };
  }
}

function isDegreeHint(str: string): boolean {
  return /bachelor|master|b\.s\.|b\.tech|b\.e\.|m\.s\.|ph\.?d|mba|associate|diploma|degree/i.test(
    str,
  );
}

function isSchoolHint(str: string): boolean {
  return /university|college|institute|school|academy|polytechnic|\bMIT\b|\bIIT\b|\bStanford\b|\bHarvard\b/i.test(
    str,
  );
}

/**
 * Parses skills preserving the user's exact skill naming.
 */
function parseSkills(
  section: SemanticSectionBlock,
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const skillNames = new Set<string>();

  for (const line of section.lines) {
    let text = line.text.trim();
    if (!text) continue;

    if (text.includes(':')) {
      text = text.split(':')[1] || '';
    }

    const tokens = text.split(/[,•|;/]+/).map((s) => s.replace(BULLET_START_REGEX, '').trim());

    for (const token of tokens) {
      // Allow single letter tech skills like C or R, up to 40 chars
      if (token && token.length >= 1 && token.length <= 40 && !/^(and|etc|including)$/i.test(token)) {
        skillNames.add(token);
      }
    }
  }

  const items: SkillItem[] = Array.from(skillNames).map((name) => ({
    id: uid('skl'),
    name,
    level: 5,
  }));

  data.skills = items;
  confidence['skills'] = items.length >= 3 ? 'high' : items.length > 0 ? 'medium' : 'low';

  if (section.headingLine) {
    sourceMapping['skills'] = {
      page: section.headingLine.page,
      blockId: section.headingLine.id,
      rawText: section.rawHeading,
    };
  }
}

/**
 * Parses projects section into ProjectItem[].
 */
function parseProjects(
  section: SemanticSectionBlock,
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const items: ProjectItem[] = [];
  let currentProject: Partial<ProjectItem> | null = null;
  const descLines: string[] = [];

  function finalizePrj(): void {
    if (currentProject && currentProject.name) {
      items.push({
        id: uid('prj'),
        name: currentProject.name,
        link: currentProject.link || '',
        tech: currentProject.tech || '',
        description: descLines.join('\n').trim(),
      });
      currentProject = null;
      descLines.length = 0;
    }
  }

  for (const line of section.lines) {
    const text = line.text.trim();
    if (!text) continue;

    const isBullet = BULLET_START_REGEX.test(text);
    const urlMatch = text.match(URL_REGEX);

    // 1. New project heading line
    if (!isBullet && (line.isAllUpper || line.maxFontSize >= 11 || !currentProject)) {
      finalizePrj();

      let titleText = text.replace(URL_REGEX, '').replace(/[\s|•,·\u002D\u2010-\u2015\u2212]+$/, '').trim();
      let projectName = titleText;
      let projectTech = '';

      // Check if title line contains a delimiter separating name and tech (e.g. "NanoLink | React.js, Node.js...")
      if (titleText.includes('|') || titleText.includes(' — ') || titleText.includes(' – ')) {
        const sep = titleText.includes('|') ? '|' : titleText.includes(' — ') ? ' — ' : ' – ';
        const parts = titleText.split(sep).map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          projectName = parts[0];
          projectTech = parts.slice(1).join(' | ').replace(/[\s|—–]+$/, '').trim();
        }
      }

      // Clean trailing icon font artifact attached to word (e.g. "NanoLinkW" -> "NanoLink", "EngineW" -> "Engine")
      projectName = projectName.replace(/[\uE000-\uF8FF\u2190-\u21FF\u25A0-\u25FF]/g, '');
      projectName = projectName
        .replace(/([a-z])([A-Z])$/, '$1')
        .replace(/[\s|•,·\u002D\u2010-\u2015\u2212]+$/, '')
        .trim();

      currentProject = {
        name: projectName,
        tech: projectTech,
        link: urlMatch ? urlMatch[0].replace(/^https?:\/\//i, '') : '',
      };
      continue;
    }

    if (currentProject) {
      // 2. Explicit Tech stack line (e.g. "Built with: Rust", "Tech: React", "Stack: Python")
      const techPrefixMatch = text.match(
        /^(?:tech(?:nologies)?|built with|tech stack|stack|tools used)\s*[:|-]\s*(.*)$/i,
      );
      if (techPrefixMatch) {
        currentProject.tech = techPrefixMatch[1].trim();
        continue;
      }

      // 3. Regular bullet / description line
      const cleaned = text.replace(BULLET_START_REGEX, '').trim();
      if (cleaned) {
        if (isBullet || descLines.length === 0) {
          descLines.push(cleaned);
        } else {
          // Wrapped multi-line bullet continuation
          descLines[descLines.length - 1] += ' ' + cleaned;
        }
      }
    }
  }

  finalizePrj();

  data.projects = items;
  confidence['projects'] = items.length > 0 ? 'high' : 'low';

  if (section.headingLine) {
    sourceMapping['projects'] = {
      page: section.headingLine.page,
      blockId: section.headingLine.id,
      rawText: section.rawHeading,
    };
  }
}

/**
 * Parses certifications section.
 */
/**
 * Parses certifications section.
 */
function parseCertifications(
  section: SemanticSectionBlock,
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const extracted = extractSectionItems(section.lines, section.rawHeading);
  const items: CertificationItem[] = extracted.map((it) => ({
    id: uid('crt'),
    name: it.name || it.text,
    issuer: it.detail || '',
    date: it.date || '',
  }));

  data.certifications = items;
  confidence['certifications'] = items.length > 0 ? 'high' : 'low';

  if (section.headingLine) {
    sourceMapping['certifications'] = {
      page: section.headingLine.page,
      blockId: section.headingLine.id,
      rawText: section.rawHeading,
    };
  }
}

/**
 * Parses languages section.
 */
function parseLanguages(
  section: SemanticSectionBlock,
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const items: LanguageItem[] = [];

  for (const line of section.lines) {
    const text = line.text.replace(BULLET_START_REGEX, '').trim();
    if (!text) continue;

    const match = text.match(/^([a-zA-Z\s]+)(?:[:\-\(]\s*([a-zA-Z\s0-9]+)\)?)?$/);
    if (match) {
      items.push({
        id: uid('lng'),
        name: match[1].trim(),
        level: match[2] ? match[2].trim() : 'Proficient',
      });
    } else {
      items.push({
        id: uid('lng'),
        name: text,
        level: '',
      });
    }
  }

  data.languages = items;
  confidence['languages'] = items.length > 0 ? 'high' : 'low';
}

/**
 * Parses publications section.
 */
function parsePublications(
  section: SemanticSectionBlock,
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const items: PublicationItem[] = [];

  for (const line of section.lines) {
    const text = line.text.replace(BULLET_START_REGEX, '').trim();
    if (!text) continue;

    const parts = text.split(/[-–—|]+/).map((s) => s.trim());
    items.push({
      id: uid('pub'),
      title: parts[0],
      meta: parts.slice(1).join(' · '),
    });
  }

  data.publications = items;
  confidence['publications'] = items.length > 0 ? 'high' : 'low';
}

/**
 * Parses interests section.
 */
function parseInterests(
  section: SemanticSectionBlock,
  data: ResumeData,
  confidence: Record<string, SectionConfidence>,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const allText = section.lines.map((l) => l.text).join(' ');
  const items: InterestItem[] = allText
    .split(/[,•|;/]+/)
    .map((s) => s.replace(BULLET_START_REGEX, '').trim())
    .filter(Boolean)
    .map((name) => ({ id: uid('int'), name }));

  data.interests = items;
  confidence['interests'] = items.length > 0 ? 'high' : 'low';
}

/**
 * Mandatory Requirement: Never lose extracted information.
 * Preserves unmapped / custom sections with their raw heading, complete content, and source location.
 * Does NOT force mixed or unmapped items into standard sections automatically.
 */
function handleUnmappedSection(
  section: SemanticSectionBlock,
  unmappedSections: UnmappedSection[],
  data: ResumeData,
  sourceMapping: Record<string, SourceLocation>,
): void {
  const headingLower = section.rawHeading.toLowerCase();
  const content = section.lines.map((l) => l.text.trim()).join('\n');
  const items = extractSectionItems(section.lines, section.rawHeading);
  const source: SourceLocation = {
    page: section.headingLine?.page || 1,
    blockId: section.headingLine?.id || 'unmapped',
    rawText: content,
  };

  let suggestedCategory: SectionKey | undefined;

  // Provide high-level section suggested category if unambiguous
  if (/volunteer|leadership|community|board/i.test(headingLower)) {
    suggestedCategory = 'experience';
  } else if (/patent|publication|paper/i.test(headingLower)) {
    suggestedCategory = 'publications';
  }

  unmappedSections.push({
    id: uid('unm'),
    rawHeading: section.rawHeading,
    content,
    confidence: 'low',
    suggestedCategory,
    source,
    itemCount: items.length,
    items,
  });
}

/**
 * Classifies an individual extracted item semantically.
 * Distinguishes achievements, coding profiles, certifications, experience, projects, and publications.
 */
export function classifyItemSemantic(
  text: string,
  rawHeading = '',
): { category: ItemCategory; label: string } {
  const t = text.toLowerCase();

  // 1. Coding Profiles & Competitive Coding Platforms (LeetCode, CodeChef, Codeforces, GeeksforGeeks, etc.)
  if (
    /\b(leetcode|codechef|geeksforgeeks|codeforces|hackerrank|hackerearth|atcoder|topcoder|kaggle)\b/i.test(t) ||
    /\b(contest\s*rating|global\s*best\s*rank|global\s*rank|problems\s*solved)\b/i.test(t)
  ) {
    return { category: 'achievements', label: 'Achievements / Coding Profiles' };
  }

  // 2. Competitive Contests, Hackathons, Olympiads, Regional Contests (ICPC, etc.)
  if (
    /\b(icpc|hackathon|olympiad|amritapuri|finalist|runner[\s-]*up|champion|1st\s+place|2nd\s+place|gold\s+medal|qualified\s+for|regionals)\b/i.test(t)
  ) {
    return { category: 'achievements', label: 'Achievements' };
  }

  // 3. Honors & Awards
  if (
    /\b(award|scholarship|fellowship|honor|merit|dean's\s+list|won\b)\b/i.test(t) &&
    !/\b(certif|course|coursera|ibm\s+certif)\b/i.test(t)
  ) {
    return { category: 'achievements', label: 'Achievements' };
  }

  // 4. Certifications & Courses (Coursera, IBM Certified, Udemy, edX, etc.)
  if (
    /\b(coursera|udemy|edx|udacity|linkedin\s+learning|pluralsight|codecademy)\b/i.test(t) ||
    /\b(certified|certification|certificate|license|licence|credential|accreditation)\b/i.test(t) ||
    /\b(ibm\s+certified|aws\s+certified|google\s+cloud|azure\s+certified)\b/i.test(t)
  ) {
    return { category: 'certifications', label: 'Certifications' };
  }

  // 5. Publications & Patents
  if (/\b(patent|publication|published|ieee|springer|acm|journal|proceedings)\b/i.test(t)) {
    return { category: 'publications', label: 'Publications' };
  }

  // 6. Leadership & Experience
  if (/\b(volunteer|leadership|community|mentor|board\s+member|advisor)\b/i.test(t)) {
    return { category: 'experience', label: 'Work Experience' };
  }

  // 7. Projects
  if (/\b(github\.com|demo|built|developed|designed|implemented)\b/i.test(t)) {
    return { category: 'projects', label: 'Projects' };
  }

  return { category: 'custom', label: 'Custom' };
}

/**
 * Extracts distinct semantic items from a list of text lines within a section.
 * Handles:
 * - Bullet-delimited items (•, *, -, numbers like 1., (1), etc.)
 * - Multi-line wrapped bullets where continuation lines are joined seamlessly into the correct item
 * - Standalone paragraphs or lines (patents, board memberships, etc.)
 * - Links, metrics, bold text, numbers
 * - Semantic classification for each extracted item
 */
export function extractSectionItems(lines: TextLine[], rawHeading = ''): ExtractedSectionItem[] {
  if (!lines || !lines.length) return [];

  const validLines = lines.filter((l) => l.text && l.text.trim().length > 0);
  if (!validLines.length) return [];

  const items: ExtractedSectionItem[] = [];
  const hasBullets = validLines.some((l) => BULLET_START_REGEX.test(l.text.trim()));

  if (hasBullets) {
    let currentItemLines: string[] = [];

    const flushCurrent = () => {
      if (currentItemLines.length > 0) {
        const fullText = currentItemLines.join(' ').replace(/\s+/g, ' ').trim();
        if (fullText) {
          items.push(buildExtractedItem(fullText, rawHeading));
        }
        currentItemLines = [];
      }
    };

    for (const line of validLines) {
      const trimmed = line.text.trim();
      if (BULLET_START_REGEX.test(trimmed)) {
        flushCurrent();
        currentItemLines.push(trimmed);
      } else {
        // Continuation of current item
        if (currentItemLines.length > 0) {
          currentItemLines.push(trimmed);
        } else {
          currentItemLines.push(trimmed);
        }
      }
    }
    flushCurrent();
  } else {
    // Non-bulleted section (e.g. patents, board memberships)
    let currentItemLines: string[] = [];

    const flushCurrent = () => {
      if (currentItemLines.length > 0) {
        const fullText = currentItemLines.join(' ').replace(/\s+/g, ' ').trim();
        if (fullText) {
          items.push(buildExtractedItem(fullText, rawHeading));
        }
        currentItemLines = [];
      }
    };

    for (let i = 0; i < validLines.length; i += 1) {
      const line = validLines[i];
      const trimmed = line.text.trim();
      const isNumbered = /^\(?\d+[\.\)]\s+/.test(trimmed);
      const isLargeGap = line.spacingBefore > line.height * 1.5;

      if (currentItemLines.length > 0) {
        if (isNumbered || isLargeGap) {
          flushCurrent();
          currentItemLines.push(trimmed);
          continue;
        }

        const isStandaloneKeyword = /^(US\s+Patent|Patent\b|Member\b|Advisor\b|Certified\b|Award\b)/i.test(trimmed);
        if (isStandaloneKeyword) {
          flushCurrent();
          currentItemLines.push(trimmed);
          continue;
        }

        const prevText = currentItemLines.join(' ');
        if ((/[.;)]$/.test(prevText) && trimmed.length > 15) || DATE_RANGE_REGEX.test(trimmed)) {
          flushCurrent();
          currentItemLines.push(trimmed);
          continue;
        }
      }

      currentItemLines.push(trimmed);
    }
    flushCurrent();
  }

  // Fallback if empty
  if (items.length === 0 && validLines.length > 0) {
    for (const line of validLines) {
      const trimmed = line.text.trim();
      if (trimmed) {
        items.push(buildExtractedItem(trimmed, rawHeading));
      }
    }
  }

  return items;
}

function buildExtractedItem(fullText: string, rawHeading = ''): ExtractedSectionItem {
  const cleanFull = stripLeadingBullet(fullText);

  // Extract year/date if present
  const dateMatch = cleanFull.match(SINGLE_YEAR_REGEX) || cleanFull.match(DATE_RANGE_REGEX);
  const date = dateMatch ? dateMatch[0] : undefined;

  // Extract URL if present
  const urlMatch = cleanFull.match(URL_REGEX);
  const url = urlMatch ? urlMatch[0] : undefined;

  let name = cleanFull;
  let detail: string | undefined;

  const dashSplit = cleanFull.split(/\s+[—–]\s+|\s+--\s+/);
  if (dashSplit.length >= 2) {
    name = dashSplit[0].trim();
    detail = dashSplit.slice(1).join(' — ').trim();
  } else if (cleanFull.includes(' - ')) {
    const parts = cleanFull.split(' - ');
    name = parts[0].trim();
    detail = parts.slice(1).join(' - ').trim();
  } else if (cleanFull.includes(' : ') && cleanFull.length > 40) {
    const parts = cleanFull.split(' : ');
    name = parts[0].trim();
    detail = parts.slice(1).join(' : ').trim();
  }

  const { category, label } = classifyItemSemantic(cleanFull, rawHeading);

  return {
    id: uid('item'),
    text: cleanFull || fullText.trim(),
    name: name || cleanFull || fullText.trim(),
    detail,
    date,
    url,
    suggestedCategory: category,
    suggestedCategoryLabel: label,
    assignedCategory: 'custom',
  };
}

import { parseResume } from '../src/lib/pdf/parser';
import type { ParsedDocument, TextLine, ColumnRegion, TextBlock } from '../src/lib/pdf/types';

function createMockDoc(lines: TextLine[], pagesCount = 1): ParsedDocument {
  return {
    pages: Array.from({ length: pagesCount }, (_, i) => ({
      pageNumber: i + 1,
      width: 595,
      height: 842,
      columns: [],
      blocks: [],
    })),
    allBlocks: [],
    allLines: lines,
    typographyMetadata: {
      avgFontSize: 10,
      headingThreshold: 11.5,
      fontFamilies: ['Helvetica'],
    },
  };
}

function line(
  text: string,
  opts: {
    y?: number;
    fontSize?: number;
    isAllUpper?: boolean;
    page?: number;
    col?: number;
    spacingBefore?: number;
  } = {},
): TextLine {
  const y = opts.y ?? 100;
  const fontSize = opts.fontSize ?? 10;
  const isAllUpper =
    opts.isAllUpper ??
    (text.length >= 3 && text === text.toUpperCase() && !/[0-9@]/.test(text));

  return {
    id: `line-${Math.random().toString(36).slice(2, 7)}`,
    page: opts.page ?? 1,
    columnIndex: opts.col ?? 0,
    y,
    height: fontSize,
    minX: 50,
    maxX: 500,
    text,
    items: [
      {
        text,
        x: 50,
        y,
        width: text.length * 6,
        height: fontSize,
        fontSize,
        fontName: isAllUpper || fontSize > 11 ? 'Helvetica-Bold' : 'Helvetica',
        page: opts.page ?? 1,
      },
    ],
    isAllUpper,
    maxFontSize: fontSize,
    spacingBefore: opts.spacingBefore ?? 4,
    spacingAfter: 4,
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  totalTests += 1;
  if (condition) {
    passedTests += 1;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

console.log('====================================================');
console.log('CRAFTPDF RESUME PARSER: 9-SCENARIO VERIFICATION SUITE');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// Scenario 1: Single-Column Standard Resume
// -----------------------------------------------------------------------------
console.log('Scenario 1: Single-Column Standard Linear Resume');
const doc1 = createMockDoc([
  line('David Miller', { fontSize: 18, y: 40 }),
  line('Senior Backend Engineer', { fontSize: 12, y: 65 }),
  line('david.miller@email.com · +1 415 555 0192 · Austin, TX', { y: 85 }),
  line('PROFESSIONAL EXPERIENCE', { isAllUpper: true, fontSize: 13, y: 120 }),
  line('Lead Engineer | CloudCorp', { fontSize: 11, y: 140 }),
  line('2021 — Present', { y: 155 }),
  line('• Scaled distributed message bus to 500k msg/sec.', { y: 170 }),
  line('EDUCATION', { isAllUpper: true, fontSize: 13, y: 210 }),
  line('B.S. in Computer Engineering', { fontSize: 11, y: 230 }),
  line('University of Texas at Austin', { y: 245 }),
  line('2015 — 2019', { y: 260 }),
  line('SKILLS', { isAllUpper: true, fontSize: 13, y: 290 }),
  line('Go, Python, Kubernetes, Redis, Docker, PostgreSQL', { y: 310 }),
]);

const res1 = parseResume(doc1);
assert(res1.data.basics.fullName === 'David Miller', 'Extracted exact name');
assert(res1.data.basics.email === 'david.miller@email.com', 'Extracted email');
assert(res1.data.experience.length === 1, 'Extracted 1 experience');
assert(res1.data.experience[0]?.company === 'CloudCorp', 'Extracted company name');
assert(res1.data.experience[0]?.role === 'Lead Engineer', 'Extracted role');
assert(res1.data.education.length === 1, 'Extracted 1 education');
assert(res1.data.skills.length === 6, 'Extracted 6 skills without duplicates');

// -----------------------------------------------------------------------------
// Scenario 2: Two-Column Split Layout (Preserves column separation)
// -----------------------------------------------------------------------------
console.log('\nScenario 2: Two-Column Split Layout (No interleaved text)');
// In a 2-column layout, col 0 is left, col 1 is right.
// Extractor sorts col 0 then col 1.
const doc2 = createMockDoc([
  // Header
  line('Sophia Chen', { fontSize: 18, y: 40 }),
  line('Product Designer', { fontSize: 12, y: 65 }),
  line('sophia@design.io · San Francisco, CA', { y: 85 }),

  // Column 0 (Left: Skills & Education)
  line('EDUCATION', { isAllUpper: true, fontSize: 13, col: 0, y: 120 }),
  line('B.A. in Interaction Design', { col: 0, y: 140 }),
  line('Rhode Island School of Design', { col: 0, y: 155 }),
  line('SKILLS', { isAllUpper: true, fontSize: 13, col: 0, y: 190 }),
  line('Figma, Wireframing, Prototyping, User Research, Design Systems', { col: 0, y: 210 }),

  // Column 1 (Right: Experience & Projects)
  line('WORK EXPERIENCE', { isAllUpper: true, fontSize: 13, col: 1, y: 120 }),
  line('Senior UX Designer | Airbnb', { col: 1, y: 140 }),
  line('2020 — Present', { col: 1, y: 155 }),
  line('• Led redesign of checkout flow increasing conversion by 14%.', { col: 1, y: 170 }),
]);

const res2 = parseResume(doc2);
assert(res2.data.basics.fullName === 'Sophia Chen', 'Extracted name');
assert(res2.data.education.length === 1, 'Education from column 0 extracted');
assert(res2.data.skills.length === 5, 'Skills from column 0 extracted');
assert(res2.data.experience.length === 1, 'Experience from column 1 extracted');
assert(res2.data.experience[0]?.company === 'Airbnb', 'Correct company mapping without column collision');

// -----------------------------------------------------------------------------
// Scenario 3: Sidebar Resume (Narrow Left Rail + Main Right)
// -----------------------------------------------------------------------------
console.log('\nScenario 3: Sidebar Layout (Contact & Languages in Sidebar)');
const doc3 = createMockDoc([
  line('Marcus Vance', { fontSize: 18, y: 40 }),
  line('vance@law.com · +1 212 555 9944 · New York, NY', { y: 65 }),
  line('LANGUAGES', { isAllUpper: true, fontSize: 12, col: 0, y: 100 }),
  line('English (Native)', { col: 0, y: 120 }),
  line('French (Fluent)', { col: 0, y: 135 }),
  line('Spanish (Intermediate)', { col: 0, y: 150 }),
  line('PROFESSIONAL EXPERIENCE', { isAllUpper: true, fontSize: 13, col: 1, y: 100 }),
  line('Senior Legal Counsel | Blackstone', { col: 1, y: 120 }),
  line('2019 — 2024', { col: 1, y: 135 }),
  line('• Managed cross-border regulatory compliance across EU & US entities.', { col: 1, y: 150 }),
]);

const res3 = parseResume(doc3);
assert(res3.data.languages.length === 3, 'Extracted 3 languages from sidebar');
assert(res3.data.languages[0]?.name === 'English', 'Language 1 correct');
assert(res3.data.languages[0]?.level === 'Native', 'Language 1 proficiency level correct');
assert(res3.data.experience.length === 1, 'Experience extracted from main body');

// -----------------------------------------------------------------------------
// Scenario 4: Unusual Section Aliases (Non-Standard Headings)
// -----------------------------------------------------------------------------
console.log('\nScenario 4: Unusual Section Aliases (Mandates, Scholastic Record, Tech Competencies)');
const doc4 = createMockDoc([
  line('Dr. Elena Rostova', { fontSize: 16 }),
  line('elena@uni.edu', {}),
  line('MANDATES & ENGAGEMENTS', { isAllUpper: true, fontSize: 13 }),
  line('Principal Consultant | McKinsey & Company', {}),
  line('2021 — 2023', {}),
  line('• Advised global pharmaceuticals on supply chain resilience.', {}),
  line('SCHOLASTIC RECORD', { isAllUpper: true, fontSize: 13 }),
  line('Ph.D. in Operations Research', {}),
  line('MIT', {}),
  line('TECH COMPETENCIES', { isAllUpper: true, fontSize: 13 }),
  line('Python, R, Gurobi, Optimization, Monte Carlo Simulation', {}),
]);

const res4 = parseResume(doc4);
assert(res4.data.experience.length === 1, 'Mandates mapped semantically to Experience');
assert(res4.data.experience[0]?.company === 'McKinsey & Company', 'Company parsed from alias');
assert(res4.data.education.length === 1, 'Scholastic Record mapped semantically to Education');
assert(res4.data.education[0]?.degree === 'Ph.D. in Operations Research', 'Degree extracted');
assert(res4.data.skills.length === 5, 'Tech Competencies mapped to Skills');

// -----------------------------------------------------------------------------
// Scenario 5: Missing Sections (Must NEVER invent data!)
// -----------------------------------------------------------------------------
console.log('\nScenario 5: Missing Sections (Zero Invention / Zero Hallucination)');
const doc5 = createMockDoc([
  line('Priya Sharma', { fontSize: 18 }),
  line('priya.sharma@gmail.com', {}),
  line('WORK EXPERIENCE', { isAllUpper: true, fontSize: 13 }),
  line('Software Developer | Infosys', {}),
  line('2022 — Present', {}),
  line('• Developed Spring Boot backend APIs.', {}),
  // Notice: No Education, No Skills, No Projects, No Phone, No Summary
]);

const res5 = parseResume(doc5);
assert(res5.data.basics.phone === '', 'Missing phone left strictly empty');
assert(res5.data.basics.summary === '', 'Missing summary left strictly empty');
assert(res5.data.education.length === 0, 'No fake education invented');
assert(res5.data.projects.length === 0, 'No fake projects invented');
assert(res5.data.skills.length === 0, 'No fake skills invented');
assert(res5.confidence['basics.phone'] === 'medium', 'Missing phone confidence marked medium');
assert(res5.confidence['education'] === 'low', 'Empty education confidence marked low');

// -----------------------------------------------------------------------------
// Scenario 6: Extra / Custom Sections (Must NEVER discard data!)
// -----------------------------------------------------------------------------
console.log('\nScenario 6: Extra / Custom Sections (Patents & Inventions, Board Memberships)');
const doc6 = createMockDoc([
  line('Arthur Pendelton', { fontSize: 18 }),
  line('arthur@pendelton.com', {}),
  line('WORK EXPERIENCE', { isAllUpper: true, fontSize: 13 }),
  line('Chief Scientist | BioTech Inc', {}),
  line('2018 — Present', {}),
  line('• Led discovery of novel enzymatic reactions.', {}),
  line('PATENTS & INVENTIONS', { isAllUpper: true, fontSize: 13 }),
  line('US Patent 9,842,109 — Thermostable Polymerase Formulations', {}),
  line('US Patent 10,123,456 — Continuous Microfluidic Synthesis System', {}),
  line('BOARD MEMBERSHIPS', { isAllUpper: true, fontSize: 13 }),
  line('Member of the Board of Advisors — Genomic Horizon Trust (2020 — Present)', {}),
]);

const res6 = parseResume(doc6);
assert(res6.unmappedSections.length >= 2, 'Both custom sections preserved in unmappedSections');
const patentSection = res6.unmappedSections.find(u => u.rawHeading.includes('PATENTS'));
const boardSection = res6.unmappedSections.find(u => u.rawHeading.includes('BOARD'));
assert(patentSection !== undefined, 'Patent section preserved without data loss');
assert(patentSection?.content.includes('US Patent 9,842,109') === true, 'Patent content preserved verbatim');
assert(boardSection !== undefined, 'Board memberships preserved without data loss');

// -----------------------------------------------------------------------------
// Scenario 7: Multi-Page Resume (Header on Page 2, Page Transition)
// -----------------------------------------------------------------------------
console.log('\nScenario 7: Multi-Page Resume (Handling page boundaries)');
const doc7 = createMockDoc([
  // Page 1
  line('Jordan Blake', { page: 1, fontSize: 18 }),
  line('jordan@blake.com', { page: 1 }),
  line('WORK EXPERIENCE', { page: 1, isAllUpper: true, fontSize: 13 }),
  line('Staff Engineer | Datadog', { page: 1 }),
  line('2022 — Present', { page: 1 }),
  line('• Architected event streaming platform processing 2M events/sec.', { page: 1 }),

  // Page 2
  line('Jordan Blake — Page 2', { page: 2, fontSize: 8 }), // Header noise
  line('Software Engineer | Twilio', { page: 2 }),
  line('2018 — 2022', { page: 2 }),
  line('• Maintained SIP signaling gateway clusters across 6 AWS regions.', { page: 2 }),
  line('EDUCATION', { page: 2, isAllUpper: true, fontSize: 13 }),
  line('B.S. in Software Engineering', { page: 2 }),
  line('San Jose State University', { page: 2 }),
  line('2014 — 2018', { page: 2 }),
], 2);

const res7 = parseResume(doc7);
assert(res7.data.experience.length === 2, 'Experiences across Page 1 and Page 2 both captured');
assert(res7.data.experience[0]?.company === 'Datadog', 'Page 1 role intact');
assert(res7.data.experience[1]?.company === 'Twilio', 'Page 2 role intact');
assert(res7.data.education.length === 1, 'Page 2 education intact');

// -----------------------------------------------------------------------------
// Scenario 8: Hyperlinks & Coding Profiles (GitHub, LinkedIn, Website, LeetCode)
// -----------------------------------------------------------------------------
console.log('\nScenario 8: Hyperlinks, Coding Profiles & Socials');
const doc8 = createMockDoc([
  line('Rohan Gupta', { fontSize: 18 }),
  line('rohan.gupta@dev.in · +91 98765 43210 · Bengaluru, India', {}),
  line('https://linkedin.com/in/rohangupta · https://github.com/rohangupta · rohangupta.dev', {}),
  line('KEY PROJECTS', { isAllUpper: true, fontSize: 13 }),
  line('MiniDB · github.com/rohangupta/minidb', {}),
  line('Built with: Rust, Tokio, Raft', {}),
  line('A distributed LSM-tree key-value store with Raft consensus.', {}),
]);

const res8 = parseResume(doc8);
assert(res8.data.basics.linkedin === 'linkedin.com/in/rohangupta', 'Extracted LinkedIn URL');
assert(res8.data.basics.github === 'github.com/rohangupta', 'Extracted GitHub URL');
assert(res8.data.basics.website === 'rohangupta.dev', 'Extracted personal website');
assert(res8.data.projects.length === 1, 'Extracted project');
assert(res8.data.projects[0]?.link === 'github.com/rohangupta/minidb', 'Extracted project repo link');
assert(res8.data.projects[0]?.tech.includes('Rust') === true, 'Extracted tech stack');

// -----------------------------------------------------------------------------
// Scenario 9: Complex Multi-Line Bullets & Nested Formatting
// -----------------------------------------------------------------------------
console.log('\nScenario 9: Complex Multi-Line Bullets & Long Achievements');
const doc9 = createMockDoc([
  line('Samantha Reed', { fontSize: 18 }),
  line('samantha@reed.io', {}),
  line('WORK EXPERIENCE', { isAllUpper: true, fontSize: 13 }),
  line('Engineering Manager | Stripe', {}),
  line('2020 — Present', {}),
  line('• Spearheaded global latency optimization project resulting in a 42% reduction in p99 API response times across North America, Europe, and Asia Pacific.', {}),
  line('• Championed the transition from legacy monolithic service to gRPC microservices, reducing CI build times from 45 minutes to 8 minutes for 200+ engineers.', {}),
  line('• Managed a budget of $2.4M annually for cloud infrastructure and tooling licenses.', {}),
]);

const res9 = parseResume(doc9);
assert(res9.data.experience.length === 1, 'Experience entry parsed');
const bullets = res9.data.experience[0]?.bullets.split('\n') || [];
assert(bullets.length === 3, 'All 3 detailed multi-line bullets parsed');
assert(bullets[0]?.includes('42% reduction') === true, 'First bullet retained exact outcome & metric');
assert(bullets[1]?.includes('from 45 minutes to 8 minutes') === true, 'Second bullet retained exact numbers');
assert(bullets[2]?.includes('$2.4M') === true, 'Third bullet retained budget metric');

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} ASSERTIONS PASSED`);
console.log('====================================================');
if (passedTests === totalTests) {
  console.log('ALL 9 QUALITY SCENARIOS VERIFIED SUCCESSFULLY! 🎉\n');
} else {
  process.exit(1);
}

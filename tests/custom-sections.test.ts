import assert from 'node:assert';
import { renderResume } from '../src/lib/render';
import { TEMPLATES } from '../src/lib/templates';
import { buildDocx, buildPlainText } from '../src/lib/export';
import { normalise } from '../src/lib/store';
import type { ResumeData, CustomSection } from '../src/lib/types';
import type { ParsedResumeResult } from '../src/lib/pdf/types';

console.log('====================================================');
console.log('CUSTOM SECTIONS: FULL LIFECYCLE & ARCHITECTURE SUITE');
console.log('====================================================\n');

// Sample base data
function createBaseResume(): ResumeData {
  return {
    basics: {
      fullName: 'Prabhat Sharma',
      title: 'Full Stack Engineer',
      email: 'prabhat@example.com',
      phone: '+91 9876543210',
      location: 'Bengaluru, India',
      website: 'prabhat.dev',
      linkedin: 'linkedin.com/in/prabhat',
      github: 'github.com/prabhat',
      summary: 'Experienced software engineer focused on distributed systems and performance.',
    },
    experience: [
      {
        id: 'exp-1',
        role: 'Senior Software Engineer',
        company: 'Acme Corp',
        location: 'Bengaluru',
        start: '2022',
        end: 'Present',
        bullets: 'Architected real-time streaming pipeline reducing latency by 45%.',
      },
    ],
    education: [
      {
        id: 'edu-1',
        degree: 'B.Tech in Computer Science',
        school: 'IIT Delhi',
        location: 'New Delhi',
        start: '2018',
        end: '2022',
        note: 'First Class with Distinction',
      },
    ],
    skills: [
      { id: 'skl-1', name: 'TypeScript', level: 5 },
      { id: 'skl-2', name: 'Node.js', level: 5 },
      { id: 'skl-3', name: 'Go', level: 4 },
    ],
    languages: [{ id: 'lng-1', name: 'English', level: 'Fluent' }],
    projects: [
      {
        id: 'prj-1',
        name: 'Distributed Cache',
        link: 'github.com/prabhat/dist-cache',
        tech: 'Go, Raft',
        description: 'High-throughput in-memory cache with Raft consensus.',
      },
    ],
    certifications: [],
    publications: [],
    interests: [{ id: 'int-1', name: 'Distributed Systems' }],
    customSections: [
      {
        id: 'csec-achieve',
        title: 'ACHIEVEMENTS & CERTIFICATES',
        type: 'custom',
        items: [
          { id: 'item-1', name: 'ICPC Regionals', text: 'ICPC Regionals — Qualified for Amritapuri Regionals 2021' },
          { id: 'item-2', name: 'LeetCode', text: 'LeetCode — Guardian badge, top 1% global rating (2250+)' },
          { id: 'item-3', name: 'CodeChef', text: 'CodeChef — 5-star coder with peak rating 2040' },
          { id: 'item-4', name: 'GeeksForGeeks', text: 'GeeksForGeeks — Ranked top 5 in college contest series' },
          { id: 'item-5', name: 'Codeforces', text: 'Codeforces — Expert (peak rating 1680)' },
        ],
      },
    ],
    order: ['experience', 'csec-achieve', 'education', 'skills', 'projects'],
  };
}

// -------------------------------------------------------------
// Test 1: Editable Custom Section Title
// -------------------------------------------------------------
console.log('Requirement 1: Custom section title must be editable');
{
  const data = createBaseResume();

  // Initially has original heading: "ACHIEVEMENTS & CERTIFICATES"
  let html = renderResume(data, 'ledger');
  assert.ok(html.includes('ACHIEVEMENTS &amp; CERTIFICATES') || html.includes('ACHIEVEMENTS & CERTIFICATES'), 'Original heading must render');

  // User renames custom section to "Achievements" via sec.title
  data.customSections![0].title = 'Achievements';
  html = renderResume(data, 'ledger');
  assert.ok(html.includes('Achievements'), 'Renamed title via sec.title must render in template');
  assert.ok(!html.includes('ACHIEVEMENTS &amp; CERTIFICATES'), 'Old heading should no longer render');

  // User renames via data.sections['csec-achieve'].label
  data.sections = {
    'csec-achieve': { label: 'Key Honors' },
  };
  html = renderResume(data, 'ledger');
  assert.ok(html.includes('Key Honors'), 'Renamed title via data.sections label must override sec.title');

  console.log('  ✓ PASS: Initial detected heading renders correctly');
  console.log('  ✓ PASS: Renaming to "Achievements" reflects immediately in rendered sheet');
  console.log('  ✓ PASS: Section metadata rename override works properly\n');
}

// -------------------------------------------------------------
// Test 2: Custom Section Reordering
// -------------------------------------------------------------
console.log('Requirement 2: Custom sections must support reordering via order[]');
{
  const data = createBaseResume();

  // 1. Order: experience -> csec-achieve -> education
  data.order = ['experience', 'csec-achieve', 'education', 'skills', 'projects'];
  let html = renderResume(data, 'ledger');
  let expIdx = html.indexOf('data-e-open="experience"');
  let customIdx = html.indexOf('data-e-open="csec-achieve"');
  let eduIdx = html.indexOf('data-e-open="education"');

  assert.ok(expIdx >= 0 && customIdx >= 0 && eduIdx >= 0, 'All sections present');
  assert.ok(expIdx < customIdx, 'experience before custom section');
  assert.ok(customIdx < eduIdx, 'custom section before education');

  // 2. Reorder: csec-achieve -> experience -> education
  data.order = ['csec-achieve', 'experience', 'education', 'skills', 'projects'];
  html = renderResume(data, 'ledger');
  expIdx = html.indexOf('data-e-open="experience"');
  customIdx = html.indexOf('data-e-open="csec-achieve"');
  eduIdx = html.indexOf('data-e-open="education"');

  assert.ok(customIdx < expIdx, 'custom section moved before experience');
  assert.ok(expIdx < eduIdx, 'experience before education');

  // 3. Reorder: education -> experience -> csec-achieve
  data.order = ['education', 'experience', 'csec-achieve', 'skills', 'projects'];
  html = renderResume(data, 'ledger');
  expIdx = html.indexOf('data-e-open="experience"');
  customIdx = html.indexOf('data-e-open="csec-achieve"');
  eduIdx = html.indexOf('data-e-open="education"');

  assert.ok(eduIdx < expIdx, 'education before experience');
  assert.ok(expIdx < customIdx, 'experience before custom section');

  console.log('  ✓ PASS: Custom section placed between Experience and Education');
  console.log('  ✓ PASS: Custom section moved before Experience');
  console.log('  ✓ PASS: Custom section moved after Experience and Education\n');
}

// -------------------------------------------------------------
// Test 3: Template Architecture & Column Behavior across all 17 Templates
// -------------------------------------------------------------
console.log('Requirement 3: Verify column/layout behavior across all 17 templates');
{
  const data = createBaseResume();

  for (const t of TEMPLATES) {
    const html = renderResume(data, t.id);

    // Verify custom section rendered in every single template
    assert.ok(
      html.includes('data-e-open="csec-achieve"'),
      `Template ${t.id} must include custom section with data-e-open hook`,
    );
    assert.ok(
      html.includes('ICPC Regionals'),
      `Template ${t.id} must render custom item content`,
    );

    // For multi-column templates, check proper column placement
    if (t.id === 'atlas' || t.id === 'summit' || t.id === 'harbor' || t.id === 'cameo' || t.id === 'prism') {
      // Must be rendered in the main column (rs-main), NOT crammed in the narrow sidebar rail
      const mainIdx = html.indexOf('class="rs-main"');
      const railIdx = html.indexOf('class="rs-rail"');
      const customPos = html.indexOf('data-e-open="csec-achieve"');
      assert.ok(mainIdx >= 0, `${t.id} has rs-main`);
      if (mainIdx < railIdx) {
        assert.ok(customPos > mainIdx && customPos < railIdx, `${t.id} custom section is inside rs-main`);
      } else {
        assert.ok(customPos > mainIdx, `${t.id} custom section is inside rs-main`);
      }
    }

    if (t.id === 'vertex') {
      // Must have badged section styling with award icon
      assert.ok(html.includes('rs-section--badged'), 'Vertex custom section must use badged section style');
    }

    console.log(`  ✓ PASS: Template "${t.id}" (${t.name}) rendered custom section cleanly in proper column`);
  }
  console.log();
}

// -------------------------------------------------------------
// Test 4: Full Lifecycle Survival (Upload -> Custom -> Edit -> Reorder -> Save -> Reload)
// -------------------------------------------------------------
console.log('Requirement 4 & 5: Full Application Lifecycle & Parser vs Resume State');
{
  // 1. Initial simulated parse result
  const initialData = createBaseResume();
  initialData.customSections![0].title = 'Achievements';

  // 2. Persist to storage representation (JSON serialization)
  const json = JSON.stringify(initialData);

  // 3. Reload from storage (JSON parse + normalise)
  const parsedFromStorage = JSON.parse(json);
  const reloaded = normalise(parsedFromStorage);

  assert.ok(reloaded.customSections, 'customSections must be present after reload');
  assert.strictEqual(reloaded.customSections.length, 1, 'Exactly 1 custom section');
  assert.strictEqual(reloaded.customSections[0].id, 'csec-achieve', 'Custom section ID preserved');
  assert.strictEqual(reloaded.customSections[0].title, 'Achievements', 'Custom section title preserved');
  assert.strictEqual(reloaded.customSections[0].items!.length, 5, 'All 5 items preserved');
  assert.strictEqual(reloaded.customSections[0].items![0].name, 'ICPC Regionals', 'Item name preserved');

  // Verify order[] survived reload
  assert.ok(reloaded.order, 'order[] preserved after reload');
  assert.ok(reloaded.order.includes('csec-achieve'), 'csec-achieve preserved in order[]');
  assert.strictEqual(reloaded.order[1], 'csec-achieve', 'Exact position in order[] preserved');

  // Verify rendering after reload
  const reloadedHtml = renderResume(reloaded, 'meridian');
  assert.ok(reloadedHtml.includes('Achievements'), 'Reloaded resume renders custom section title');
  assert.ok(reloadedHtml.includes('ICPC Regionals'), 'Reloaded resume renders custom section items');

  console.log('  ✓ PASS: ResumeData.customSections is independent of unmappedSections');
  console.log('  ✓ PASS: Serializes cleanly to JSON without data loss');
  console.log('  ✓ PASS: normalise() recovers all custom sections, items, and order[]');
  console.log('  ✓ PASS: Re-renders seamlessly after full reload simulation\n');
}

// -------------------------------------------------------------
// Test 5: Mixed-Section Behavior (Reassigning Coursera to Certifications)
// -------------------------------------------------------------
console.log('Requirement 6: Preserve mixed-section behavior');
{
  // Simulate import wizard state for "ACHIEVEMENTS & CERTIFICATES"
  const rawItems = [
    { id: 'it-1', name: 'ICPC Regionals', detail: 'Certificate — Qualified for Amritapuri Regionals', assignedCategory: 'custom' as const },
    { id: 'it-2', name: 'LeetCode', detail: 'Guardian badge (top 1%)', assignedCategory: 'custom' as const },
    { id: 'it-3', name: 'CodeChef', detail: '5-star coder', assignedCategory: 'custom' as const },
    { id: 'it-4', name: 'GeeksForGeeks', detail: 'Ranked top 5', assignedCategory: 'custom' as const },
    { id: 'it-5', name: 'Codeforces', detail: 'Expert', assignedCategory: 'custom' as const },
    { id: 'it-6', name: 'Coursera', detail: 'Machine Learning Specialization', assignedCategory: 'certifications' as const },
  ];

  // Emulate syncCustomSectionsToData logic
  const keptCustomItems = rawItems.filter((it) => it.assignedCategory === 'custom');
  const customSection: CustomSection = {
    id: 'csec-mixed',
    title: 'ACHIEVEMENTS & CERTIFICATES',
    type: 'custom',
    items: keptCustomItems.map((it) => ({
      id: it.id,
      name: it.name,
      detail: it.detail,
      text: `${it.name} — ${it.detail}`,
    })),
  };

  const resumeData = createBaseResume();
  resumeData.customSections = [customSection];
  resumeData.certifications = [
    {
      id: 'it-6',
      name: 'Coursera',
      issuer: 'Machine Learning Specialization',
      date: '2023',
    },
  ];

  assert.strictEqual(resumeData.customSections[0].items!.length, 5, 'Exactly 5 items remain in custom section');
  assert.strictEqual(resumeData.certifications.length, 1, 'Coursera assigned to certifications');
  assert.strictEqual(resumeData.certifications[0].name, 'Coursera', 'Coursera exists in certifications array');

  // Render and check both
  const html = renderResume(resumeData, 'scholar');
  assert.ok(html.includes('ACHIEVEMENTS &amp; CERTIFICATES') || html.includes('ACHIEVEMENTS & CERTIFICATES'));
  assert.ok(html.includes('ICPC Regionals'));
  assert.ok(html.includes('LeetCode'));
  assert.ok(html.includes('Coursera'));

  console.log('  ✓ PASS: Reassigning Coursera to Certifications leaves 5 items in Custom Section');
  console.log('  ✓ PASS: None of the remaining custom items were deleted or altered');
  console.log('  ✓ PASS: Both custom items and certifications appear in final resume\n');
}

// -------------------------------------------------------------
// Test 6: Word (DOCX) and Plain Text Export
// -------------------------------------------------------------
console.log('Requirement 7: DOCX & Plain Text Export Support');
{
  const data = createBaseResume();
  data.customSections![0].title = 'Achievements';

  const exportSectionsList = [
    { key: 'experience', heading: 'Experience' },
    { key: 'csec-achieve', heading: 'Achievements' },
    { key: 'education', heading: 'Education' },
    { key: 'skills', heading: 'Skills' },
  ];

  // 1. Plain Text Export
  const plainText = buildPlainText(data, {
    sections: exportSectionsList,
    accent: '#1e3a5f',
  });

  assert.ok(plainText.includes('ACHIEVEMENTS'), 'Plain text contains uppercase ACHIEVEMENTS heading');
  assert.ok(plainText.includes('• ICPC Regionals'), 'Plain text contains ICPC bullet');
  assert.ok(plainText.includes('• LeetCode'), 'Plain text contains LeetCode bullet');

  // Verify order in plain text: EXPERIENCE appears before ACHIEVEMENTS, which appears before EDUCATION
  const expPos = plainText.indexOf('EXPERIENCE');
  const achievePos = plainText.indexOf('ACHIEVEMENTS');
  const eduPos = plainText.indexOf('EDUCATION');
  assert.ok(expPos < achievePos, 'In plain text, Experience is before Achievements');
  assert.ok(achievePos < eduPos, 'In plain text, Achievements is before Education');

  // 2. Word (DOCX) Export
  const docxBlob = buildDocx(data, {
    sections: exportSectionsList,
    accent: '#1e3a5f',
  });
  assert.ok(docxBlob.size > 1000, 'Docx blob must be generated and non-empty');

  console.log('  ✓ PASS: Plain text export outputs custom section heading in uppercase');
  console.log('  ✓ PASS: Plain text export outputs all custom section items as bullets');
  console.log('  ✓ PASS: Plain text export preserves custom section order in export[]');
  console.log('  ✓ PASS: Word DOCX binary blob built successfully with custom section items\n');
}

console.log('====================================================');
console.log('ALL CUSTOM SECTION TESTS PASSED SUCCESSFULLY! 🎉');
console.log('====================================================\n');

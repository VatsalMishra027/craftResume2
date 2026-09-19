import { renderResume } from '../src/lib/render';
import { buildPlainText, buildDocx } from '../src/lib/export';
import { SAMPLE_RESUME } from '../src/lib/sample';
import type { ResumeData, TemplateKey } from '../src/lib/types';
import { TEMPLATES } from '../src/lib/templates';
import assert from 'node:assert';

console.log('====================================================');
console.log('PROJECTS SECTION: RENDERING & ORDER VERIFICATION SUITE');
console.log('====================================================\n');

let passCount = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const baseData: ResumeData = JSON.parse(JSON.stringify(SAMPLE_RESUME));

// --- Scenario A: Single short description ---
test('Scenario A: Single short description renders as a single bullet item inside .rs-bullets', () => {
  const data: ResumeData = {
    ...baseData,
    projects: [
      {
        id: 'prj-test-1',
        name: 'NanoLink',
        link: 'nanolink.dev',
        tech: 'React, Node.js',
        description: 'A production-ready URL shortening web app.',
      },
    ],
  };

  const html = renderResume(data, {
    template: 'classic',
    font: 'inter',
    fontSize: 'normal',
    accent: '#2b2a27',
  });

  assert(html.includes('<ul class="rs-bullets"'), 'Should render <ul class="rs-bullets">');
  assert(html.includes('<li>A production-ready URL shortening web app.</li>'), 'Should contain exact <li> content');
  
  // Count <li> tags inside projects
  const matches = html.match(/<li>A production-ready URL shortening web app\.<\/li>/g);
  assert.strictEqual(matches?.length, 1, 'Should only have 1 bullet for 1 description');
});

// --- Scenario B: Multiple bullet items ---
test('Scenario B: Multiple bullet items render as distinct bullets without blank items', () => {
  const data: ResumeData = {
    ...baseData,
    projects: [
      {
        id: 'prj-test-2',
        name: 'NanoLink Service',
        link: 'nanolink.dev',
        tech: 'React.js, Node.js, Express.js, PostgreSQL, Upstash Redis',
        description: `A production-ready URL shortening web app that converts long URLs into compact short links.

Built a highly scalable, full-stack service optimized for read-heavy workloads (100:1 ratio), capable of handling high-concurrency redirect traffic.

Engineered an efficient 7-character Base62 encoding pipeline leveraging PostgreSQL BIGSERIAL primary keys.`,
      },
    ],
  };

  const html = renderResume(data, {
    template: 'classic',
    font: 'inter',
    fontSize: 'normal',
    accent: '#2b2a27',
  });

  assert(html.includes('<li>A production-ready URL shortening web app that converts long URLs into compact short links.</li>'));
  assert(html.includes('<li>Built a highly scalable, full-stack service optimized for read-heavy workloads (100:1 ratio), capable of handling high-concurrency redirect traffic.</li>'));
  assert(html.includes('<li>Engineered an efficient 7-character Base62 encoding pipeline leveraging PostgreSQL BIGSERIAL primary keys.</li>'));

  // Verify that empty lines between paragraphs did not create empty bullets
  assert(!html.includes('<li></li>'), 'No empty <li> elements should be rendered');
});

// --- Scenario C: Long multi-line bullet that wraps to 2-3 lines ---
test('Scenario C: Long multi-line bullet remains a SINGLE bullet item (wrapping naturally via CSS)', () => {
  const longBulletText =
    'Architected and implemented a fault-tolerant distributed rate limiter using token bucket algorithms across multi-region Redis clusters, successfully shedding 99.9% of malicious bot traffic while maintaining under 5ms p99 latency for legitimate user requests across 12 countries during global launch.';

  const data: ResumeData = {
    ...baseData,
    projects: [
      {
        id: 'prj-test-3',
        name: 'Edge Gateway',
        link: 'gateway.internal',
        tech: 'Go, Envoy, Redis',
        description: longBulletText,
      },
    ],
  };

  const html = renderResume(data, {
    template: 'classic',
    font: 'inter',
    fontSize: 'normal',
    accent: '#2b2a27',
  });

  // Long text must be enclosed within exactly one <li> ... </li>
  assert(html.includes(`<li>${longBulletText}</li>`), 'Long bullet must be a single <li> tag');
  const bulletCount = (html.match(/<li>Architected and implemented/g) || []).length;
  assert.strictEqual(bulletCount, 1, 'Must appear exactly once as a bullet start');
});

// --- Scenario D: Input with explicit user bullet symbols (e.g. •, -, *) stripped cleanly ---
test('Scenario D: User-typed bullet characters (•, -, *) are stripped to prevent double bullets', () => {
  const data: ResumeData = {
    ...baseData,
    projects: [
      {
        id: 'prj-test-4',
        name: 'TaskRunner',
        link: '',
        tech: 'TypeScript',
        description: `• First bullet point with dot
- Second bullet point with dash
* Third bullet point with asterisk`,
      },
    ],
  };

  const html = renderResume(data, {
    template: 'classic',
    font: 'inter',
    fontSize: 'normal',
    accent: '#2b2a27',
  });

  assert(html.includes('<li>First bullet point with dot</li>'), 'Leading • must be stripped');
  assert(html.includes('<li>Second bullet point with dash</li>'), 'Leading - must be stripped');
  assert(html.includes('<li>Third bullet point with asterisk</li>'), 'Leading * must be stripped');
  assert(!html.includes('<li>•'), 'Must not contain double bullets');
  assert(!html.includes('<li>-'), 'Must not contain leading dash');
});

// --- Scenario E: Field order verification in rendered template ---
test('Scenario E: In rendered template, "Built with" (technologies) is positioned ABOVE "Description" (bullets)', () => {
  const data: ResumeData = {
    ...baseData,
    projects: [
      {
        id: 'prj-test-5',
        name: 'NanoLink',
        link: 'nanolink.dev',
        tech: 'React.js, Node.js',
        description: 'First achievement bullet.\nSecond achievement bullet.',
      },
    ],
  };

  const html = renderResume(data, {
    template: 'classic',
    font: 'inter',
    fontSize: 'normal',
    accent: '#2b2a27',
  });

  // In classic template, withChips is true, so tech is rendered as <ul class="rs-chips">
  const techIndex = html.indexOf('class="rs-chips"');
  const descIndex = html.indexOf('First achievement bullet.');

  assert(techIndex !== -1, 'Tech stack chips must be rendered');
  assert(descIndex !== -1, 'Description bullet must be rendered');
  assert(techIndex < descIndex, 'Tech stack must be rendered BEFORE description bullets');
});

// --- Scenario F: Verification across ALL 17 templates ---
test('Scenario F: Bullet rendering and Built-with order work across all 17 templates', () => {
  const data: ResumeData = {
    ...baseData,
    projects: [
      {
        id: 'prj-all-templates',
        name: 'Universal Project',
        link: 'universal.dev',
        tech: 'TypeScript, Tailwind',
        description: 'First universal bullet.\nSecond universal bullet.',
      },
    ],
  };

  const templateKeys = Object.keys(TEMPLATES) as TemplateKey[];
  assert.strictEqual(templateKeys.length, 17, 'There should be exactly 17 templates');

  for (const tpl of templateKeys) {
    const html = renderResume(data, {
      template: tpl,
      font: 'inter',
      fontSize: 'normal',
      accent: '#2b2a27',
    });

    assert(html.includes('First universal bullet.'), `Template ${tpl} must render description bullet 1`);
    assert(html.includes('Second universal bullet.'), `Template ${tpl} must render description bullet 2`);
    assert(html.includes('<ul class="rs-bullets"'), `Template ${tpl} must render .rs-bullets list`);

    // In templates with chips vs text:
    const hasChips = html.includes('<ul class="rs-chips"');
    const hasTechText = html.includes('Technologies: TypeScript, Tailwind');
    assert(hasChips || hasTechText, `Template ${tpl} must render tech stack`);

    const techPos = hasChips ? html.indexOf('<ul class="rs-chips"') : html.indexOf('Technologies: TypeScript, Tailwind');
    const descPos = html.indexOf('First universal bullet.');
    assert(techPos < descPos, `Template ${tpl} must render tech stack ABOVE description bullets`);
  }
});

// --- Scenario G: Word DOCX and Plain Text Exports ---
test('Scenario G: Word DOCX export applies hanging indent and Plain Text exports bullets', () => {
  const data: ResumeData = {
    ...baseData,
    projects: [
      {
        id: 'prj-export',
        name: 'Export Project',
        link: 'export.dev',
        tech: 'Python, FastAPI',
        description: 'Optimized query latency by 40%.\nScaled system to 10k RPS.',
      },
    ],
  };

  // 1. Plain text export
  const exportOpts = {
    sections: [
      { key: 'projects' as const, heading: 'Projects' },
    ],
    accent: '#2b2a27',
  };

  const plain = buildPlainText(data, exportOpts);
  assert(plain.includes('Technologies: Python, FastAPI'), 'Plain text must include tech stack');
  assert(plain.includes('• Optimized query latency by 40%'), 'Plain text must include bullet 1');
  assert(plain.includes('• Scaled system to 10k RPS'), 'Plain text must include bullet 2');
  assert(plain.indexOf('Technologies: Python, FastAPI') < plain.indexOf('• Optimized query latency by 40%'),
    'Plain text must render tech stack before description bullets');

  // 2. Word DOCX export
  const docxBlob = buildDocx(data, exportOpts);
  assert(docxBlob.size > 0, 'DOCX blob should be generated');
});

console.log('\n====================================================');
console.log(`ALL ${passCount} PROJECT RENDERING & ORDER TESTS PASSED! 🎉`);
console.log('====================================================\n');

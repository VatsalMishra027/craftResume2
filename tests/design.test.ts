import assert from 'node:assert/strict';
import {
  DEFAULT_DESIGN,
  MARGIN_TEMPLATES,
  accentHighlight,
  designClass,
  designStyle,
  isDefaultDesign,
  normaliseDesign,
  normaliseLooks,
} from '../src/lib/design';
import { TEMPLATES } from '../src/lib/templates';

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ✓ PASS: ${name}`);
}

check('an untouched design adds nothing to the sheet', () => {
  assert.equal(designClass({ ...DEFAULT_DESIGN }, 'ledger'), '');
  assert.equal(designStyle({ ...DEFAULT_DESIGN }), '');
  assert.ok(isDefaultDesign(normaliseDesign(undefined)));
  assert.ok(isDefaultDesign(normaliseDesign('garbage')));
});

check('values are clamped and snapped so no stored value can break a layout', () => {
  const d = normaliseDesign({ margin: 9999, space: -5, lineHeight: 1, color: 'red' });
  assert.equal(d.margin, 125);
  assert.equal(d.space, 70);
  assert.equal(d.lineHeight, 125);
  assert.equal(d.color, '');
  assert.equal(normaliseDesign({ margin: 'abc' }).margin, 100);
});

check('colour must be a #rrggbb hex', () => {
  assert.equal(normaliseDesign({ color: '#ABCDEF' }).color, '#abcdef');
  assert.equal(normaliseDesign({ color: 'url(javascript:1)' }).color, '');
  assert.equal(normaliseDesign({ color: '#abc' }).color, '');
});

check('gate classes only appear for tweaked, applicable controls', () => {
  assert.equal(designClass({ ...DEFAULT_DESIGN, margin: 110 }, 'ledger'), ' ds-mg');
  assert.equal(designClass({ ...DEFAULT_DESIGN, margin: 110 }, 'atlas'), '');
  assert.equal(designClass({ ...DEFAULT_DESIGN, space: 80, lineHeight: 150 }, 'atlas'), ' ds-sp ds-lh');
});

check('style carries the custom accent and the multipliers', () => {
  const s = designStyle({ color: '#bd5a33', margin: 110, space: 80, lineHeight: 150 });
  assert.match(s, /^;--rs-accent:#bd5a33;--rs-accent-hi:#[0-9a-f]{6};--ds-mg:1.1;--ds-sp:0.8;--ds-lh:1.5$/);
});

check('highlight colour is always a valid, lighter hex', () => {
  for (const hex of ['#000000', '#ffffff', '#1e3a5f', '#bd5a33', '#12784f']) {
    assert.match(accentHighlight(hex), /^#[0-9a-f]{6}$/);
  }
});

check('every margin layout exists', () => {
  const ids = new Set(TEMPLATES.map((t) => t.id));
  for (const id of MARGIN_TEMPLATES) assert.ok(ids.has(id), id);
});

check('saved looks are sanitised and capped', () => {
  assert.deepEqual(normaliseLooks('nope'), []);
  const looks = normaliseLooks([
    { id: 'a', name: '  My look  ', template: 'ledger', accent: 'navy', font: 'inter', design: { margin: 500 } },
    { id: 'b', name: '' },
    null,
    { name: 'no id' },
  ]);
  assert.equal(looks.length, 1);
  assert.equal(looks[0].name, 'My look');
  assert.equal(looks[0].design.margin, 125);
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `i${i}`, name: `n${i}` }));
  assert.equal(normaliseLooks(many).length, 12);
});

console.log(`\nDESIGN LAYER: ${passed} checks passed`);

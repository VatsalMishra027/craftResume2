/**
 * Wires the Design menu. It owns no layout logic: it reads and writes the
 * design store, asks the editor to repaint, and — to apply a saved look — clicks
 * the same template, colour and typeface buttons a person would, so every one
 * of those keeps going through the editor's own code.
 */
import {
  DESIGN_LIMITS,
  DEFAULT_DESIGN,
  MARGIN_TEMPLATES,
  MAX_LOOKS,
  getDesign,
  loadLooks,
  saveLooks,
  setDesign,
  type Design,
  type SavedLook,
} from '../lib/design';
import { loadAccent, loadFont, loadTemplate } from '../lib/store';
import { resolveAccent, templateMeta } from '../lib/templates';

type RangeKey = 'margin' | 'space' | 'lineHeight';
const RANGES: RangeKey[] = ['margin', 'space', 'lineHeight'];

export function initDesignMenu(repaint: () => void): void {
  const root = document.querySelector<HTMLElement>('[data-design-root]');
  if (!root) return;

  const color = root.querySelector<HTMLInputElement>('[data-design-color]')!;
  const colorNote = root.querySelector<HTMLElement>('[data-design-color-note]')!;
  const colorClear = root.querySelector<HTMLButtonElement>('[data-design-color-clear]')!;
  const marginNote = root.querySelector<HTMLElement>('[data-design-margin-note]')!;
  const saveForm = root.querySelector<HTMLFormElement>('[data-design-save-form]')!;
  const nameInput = root.querySelector<HTMLInputElement>('[data-design-name]')!;
  const looksList = root.querySelector<HTMLUListElement>('[data-design-looks]')!;
  const looksEmpty = root.querySelector<HTMLElement>('[data-design-looks-empty]')!;
  const ranges = new Map(
    RANGES.map((key) => [key, root.querySelector<HTMLInputElement>(`[data-design-range="${key}"]`)!]),
  );
  const outs = new Map(
    RANGES.map((key) => [key, root.querySelector<HTMLElement>(`[data-design-out="${key}"]`)!]),
  );

  // The line-height slider's "0 = the layout's own" sits just below its minimum.
  const lhOff = DESIGN_LIMITS.lineHeight.min - DESIGN_LIMITS.lineHeight.step;
  ranges.forEach((input, key) => {
    const lim = DESIGN_LIMITS[key];
    input.min = String(key === 'lineHeight' ? lhOff : lim.min);
    input.max = String(lim.max);
    input.step = String(lim.step);
  });

  function label(key: RangeKey, design: Design): string {
    if (key === 'lineHeight') {
      return design.lineHeight ? (design.lineHeight / 100).toFixed(2) : 'Layout default';
    }
    return `${design[key]}%`;
  }

  /** Reflects the stored design (and the current layout) in the controls. */
  function sync(): void {
    const design = getDesign();
    ranges.forEach((input, key) => {
      input.value = String(key === 'lineHeight' && !design.lineHeight ? lhOff : design[key]);
      outs.get(key)!.textContent = label(key, design);
    });
    const supportsMargin = MARGIN_TEMPLATES.has(loadTemplate());
    ranges.get('margin')!.disabled = !supportsMargin;
    marginNote.hidden = supportsMargin;

    colorClear.hidden = !design.color;
    colorNote.textContent = design.color ? design.color.toUpperCase() : 'Using the preset colour';
    color.value = design.color || resolveAccent(loadAccent()).hex;
  }

  function update(patch: Partial<Design>): void {
    setDesign({ ...getDesign(), ...patch });
    sync();
    repaint();
  }

  ranges.forEach((input, key) => {
    input.addEventListener('input', () => {
      const raw = Number(input.value);
      update({ [key]: key === 'lineHeight' && raw < DESIGN_LIMITS.lineHeight.min ? 0 : raw });
    });
  });

  color.addEventListener('input', () => update({ color: color.value }));
  colorClear.addEventListener('click', () => update({ color: '' }));
  root
    .querySelector('[data-design-reset]')!
    .addEventListener('click', () => update({ ...DEFAULT_DESIGN }));

  /* --- My templates ------------------------------------------------------- */
  let looks = loadLooks();

  function renderLooks(): void {
    looksList.innerHTML = '';
    looksEmpty.hidden = looks.length > 0;
    looks.forEach((look) => {
      const li = document.createElement('li');
      li.className = 'design-look';
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'design-look-apply';
      apply.dataset.lookApply = look.id;
      apply.textContent = look.name;
      const meta = document.createElement('small');
      meta.textContent = templateMeta(look.template).name;
      apply.appendChild(meta);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'design-look-del';
      del.dataset.lookDelete = look.id;
      del.setAttribute('aria-label', `Delete ${look.name}`);
      del.textContent = '×';
      li.append(apply, del);
      looksList.appendChild(li);
    });
  }

  saveForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    const look: SavedLook = {
      id: `look-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      template: loadTemplate(),
      accent: loadAccent(),
      font: loadFont(),
      design: { ...getDesign() },
    };
    looks = [look, ...looks].slice(0, MAX_LOOKS);
    saveLooks(looks);
    nameInput.value = '';
    renderLooks();
  });

  function click(selector: string): void {
    document.querySelector<HTMLElement>(selector)?.click();
  }

  looksList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const del = target.closest<HTMLElement>('[data-look-delete]');
    if (del) {
      looks = looks.filter((l) => l.id !== del.dataset.lookDelete);
      saveLooks(looks);
      renderLooks();
      return;
    }
    const apply = target.closest<HTMLElement>('[data-look-apply]');
    const look = apply && looks.find((l) => l.id === apply.dataset.lookApply);
    if (!look) return;

    // The design goes in first so the repaint the template click triggers
    // already carries it; the rest reuse the editor's own buttons.
    setDesign(look.design);
    if (look.template) click(`[data-template="${look.template}"]`);
    if (look.accent) click(`[data-accent="${look.accent}"]`);
    if (look.font) click(`[data-font="${look.font}"]`);
    sync();
    repaint();
  });

  // A layout change decides whether the margin slider has anything to move.
  document.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-template]')) {
      queueMicrotask(sync);
    }
  });

  renderLooks();
  sync();
}

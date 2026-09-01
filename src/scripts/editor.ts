import { renderResume, sheetClass, sheetStyle } from '../lib/render';
import {
  EMPTY_RESUME,
  SPLIT_DEFAULT,
  clampSplit,
  hasSavedResume,
  loadAccent,
  loadResume,
  loadSplit,
  loadTemplate,
  saveAccent,
  saveResume,
  saveSplit,
  saveTemplate,
  uid,
} from '../lib/store';
import { resolveAccent, resolveTemplate } from '../lib/templates';
import { getBlueprint } from '../lib/blueprints';
import { fitSheet } from '../lib/fit';
import { SECTION_KEYS as SECTIONS } from '../lib/types';
import type { AnyItem, PanelKey, ResumeData, SectionKey, SectionMeta } from '../lib/types';

const CONTROL =
  'mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 hover:border-line-strong focus:border-ink focus:outline-none';

function escAttr(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface FieldSpec {
  key: string;
  label: string;
  placeholder?: string;
  rows?: number;
  /** Renders the 1–5 proficiency select instead of a text control. */
  level?: boolean;
  /** Spans both columns inside the two-column card. */
  full?: boolean;
  hint?: string;
}

const LEVEL_WORDS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];

function fieldHtml(spec: FieldSpec, value: string): string {
  let control: string;

  if (spec.level) {
    const current = Number(value) || 5;
    const options = LEVEL_WORDS.map(
      (word, index) =>
        `<option value="${index + 1}"${index + 1 === current ? ' selected' : ''}>${index + 1} · ${word}</option>`,
    ).join('');
    control = `<select data-key="${spec.key}" class="${CONTROL}">${options}</select>`;
  } else if (spec.rows && spec.rows > 0) {
    control = `<textarea data-key="${spec.key}" rows="${spec.rows}" placeholder="${escAttr(spec.placeholder ?? '')}" class="${CONTROL} resize-y leading-relaxed">${escAttr(value)}</textarea>`;
  } else {
    control = `<input data-key="${spec.key}" type="text" value="${escAttr(value)}" placeholder="${escAttr(spec.placeholder ?? '')}" class="${CONTROL}" />`;
  }

  return `<label class="block ${spec.full ? 'sm:col-span-2' : ''}">
    <span class="text-xs font-medium text-ink-soft">${escAttr(spec.label)}</span>
    ${control}
    ${spec.hint ? `<span class="mt-1.5 block text-[11px] leading-relaxed text-ink-faint">${escAttr(spec.hint)}</span>` : ''}
  </label>`;
}

const SECTION_FIELDS: Record<SectionKey, FieldSpec[]> = {
  experience: [
    { key: 'role', label: 'Job title', placeholder: 'Senior Product Designer' },
    { key: 'company', label: 'Company', placeholder: 'Northwind Systems' },
    { key: 'start', label: 'From', placeholder: '2022' },
    { key: 'end', label: 'To', placeholder: 'Present' },
    { key: 'location', label: 'Location', placeholder: 'Bengaluru', full: true },
    {
      key: 'bullets',
      label: 'What you did',
      rows: 4,
      full: true,
      placeholder: 'Rebuilt onboarding, lifting activation from 34% to 61%.',
      hint: 'One achievement per line. Lead with the outcome, then the number.',
    },
  ],
  education: [
    { key: 'degree', label: 'Qualification', placeholder: 'B.Des, Interaction Design' },
    { key: 'school', label: 'Institution', placeholder: 'National Institute of Design' },
    { key: 'start', label: 'From', placeholder: '2015' },
    { key: 'end', label: 'To', placeholder: '2019' },
    { key: 'location', label: 'Location', placeholder: 'Ahmedabad' },
    { key: 'note', label: 'Note', placeholder: 'Graduated with distinction' },
  ],
  skills: [
    { key: 'name', label: 'Skill', placeholder: 'Design systems' },
    { key: 'level', label: 'Proficiency', level: true },
  ],
  languages: [
    { key: 'name', label: 'Language', placeholder: 'English' },
    { key: 'level', label: 'Proficiency', placeholder: 'Native / Bilingual' },
  ],
  projects: [
    { key: 'name', label: 'Project', placeholder: 'Fieldnote' },
    { key: 'link', label: 'Link', placeholder: 'fieldnote.app' },
    {
      key: 'description',
      label: 'Description',
      rows: 3,
      full: true,
      placeholder: 'An offline-first research notebook. 4,000 monthly users.',
    },
    {
      key: 'tech',
      label: 'Built with',
      full: true,
      placeholder: 'Figma, React, IndexedDB',
      hint: 'Separate with commas.',
    },
  ],
  certifications: [
    { key: 'name', label: 'Certification', placeholder: 'NN/g UX Certification' },
    { key: 'issuer', label: 'Issued by', placeholder: 'Nielsen Norman Group' },
    { key: 'date', label: 'Date', placeholder: '2023-04', full: true },
  ],
  publications: [
    { key: 'title', label: 'Title', placeholder: 'Empty states are a research artefact' },
    { key: 'meta', label: 'Where and when', placeholder: 'Smashing Magazine, 2022' },
  ],
  interests: [{ key: 'name', label: 'Interest', placeholder: 'Typography', full: true }],
};

interface SectionLabel {
  singular: string;
  empty: string;
  /** Field whose value titles the card once it has been filled in. */
  titleKey: string;
}

const SECTION_LABELS: Record<SectionKey, SectionLabel> = {
  experience: {
    singular: 'Role',
    empty: 'No roles yet. Add your most recent job first.',
    titleKey: 'role',
  },
  education: {
    singular: 'Qualification',
    empty: 'No education added yet.',
    titleKey: 'degree',
  },
  skills: {
    singular: 'Skill',
    empty: 'No skills yet. Add the ones the job advert actually names.',
    titleKey: 'name',
  },
  languages: {
    singular: 'Language',
    empty: 'No languages yet.',
    titleKey: 'name',
  },
  projects: {
    singular: 'Project',
    empty: 'Optional. Useful when your side work is the strongest evidence.',
    titleKey: 'name',
  },
  certifications: {
    singular: 'Certification',
    empty: 'No certifications yet.',
    titleKey: 'name',
  },
  publications: {
    singular: 'Publication',
    empty: 'No publications, talks or patents yet.',
    titleKey: 'title',
  },
  interests: {
    singular: 'Interest',
    empty: 'Optional. Three is plenty.',
    titleKey: 'name',
  },
};

function blankItem(section: SectionKey): AnyItem {
  switch (section) {
    case 'experience':
      return { id: uid('exp'), role: '', company: '', location: '', start: '', end: '', bullets: '' };
    case 'education':
      return { id: uid('edu'), degree: '', school: '', location: '', start: '', end: '', note: '' };
    case 'skills':
      return { id: uid('skl'), name: '', level: 5 };
    case 'languages':
      return { id: uid('lng'), name: '', level: '' };
    case 'projects':
      return { id: uid('prj'), name: '', link: '', description: '', tech: '' };
    case 'certifications':
      return { id: uid('crt'), name: '', issuer: '', date: '' };
    case 'publications':
      return { id: uid('pub'), title: '', meta: '' };
    default:
      return { id: uid('int'), name: '' };
  }
}

export function initEditor(): void {
  const form = document.querySelector<HTMLElement>('[data-editor-form]');
  const preview = document.querySelector<HTMLElement>('[data-preview]');
  const previewFit = document.querySelector<HTMLElement>('[data-sheet-fit="flow"]');
  const printRoot = document.querySelector<HTMLElement>('.print-root');
  const grid = document.querySelector<HTMLElement>('.editor-grid');
  if (!form || !preview || !previewFit || !printRoot || !grid) return;

  const params = new URLSearchParams(location.search);
  let data: ResumeData = loadResume();
  let template = params.has('template') ? resolveTemplate(params.get('template')) : loadTemplate();
  let accent = params.has('accent') ? resolveAccent(params.get('accent')).id : loadAccent();
  let panel: PanelKey = 'basics';

  /**
   * `?blueprint=` opens the editor on a complete resume written for one job
   * family. It replaces everything, so an existing draft gets a say first.
   * The layout and colour come with it unless the URL names its own.
   */
  const blueprint = getBlueprint(params.get('blueprint'));
  if (blueprint) {
    const replace =
      !hasSavedResume() ||
      window.confirm(
        `Replace the resume saved in this browser with the ${blueprint.role} blueprint?`,
      );

    if (replace) {
      data = structuredClone(blueprint.data);
      if (!params.has('template')) template = resolveTemplate(blueprint.template);
      if (!params.has('accent')) accent = resolveAccent(blueprint.accent).id;
      saveResume(data);
    }

    // Drop the parameter so a refresh does not ask again.
    const url = new URL(location.href);
    url.searchParams.delete('blueprint');
    history.replaceState(null, '', url);
  }

  saveTemplate(template);
  saveAccent(accent);

  let saveTimer: number | undefined;
  const statusEl = document.querySelector<HTMLElement>('[data-save-status]');

  function markSaved(): void {
    window.clearTimeout(saveTimer);
    if (statusEl) statusEl.textContent = 'Saving…';
    saveTimer = window.setTimeout(() => {
      saveResume(data);
      if (statusEl) statusEl.textContent = 'Saved to this browser';
    }, 400);
  }

  /** 297mm in CSS pixels at 96dpi — the height of one A4 page. */
  const A4_HEIGHT_PX = 1122.52;
  const pageCountEl = document.querySelector<HTMLElement>('[data-page-count]');
  const pageNoteEl = document.querySelector<HTMLElement>('[data-page-note]');

  function reportPageCount(): void {
    // A 2px tolerance stops a sheet that exactly fills page one reading as two.
    const pages = Math.max(1, Math.ceil((preview!.scrollHeight - 2) / A4_HEIGHT_PX));
    previewFit!.classList.toggle('is-multipage', pages > 1);
    pageNoteEl?.classList.toggle('hidden', pages === 1);
    if (pageCountEl) {
      pageCountEl.textContent = `${pages} ${pages === 1 ? 'page' : 'pages'} · A4`;
    }
  }

  function paintPreview(): void {
    preview!.className = `${sheetClass(template)} resume-sheet--live`;
    preview!.setAttribute('style', sheetStyle(accent));
    preview!.innerHTML = renderResume(data, template);
    fitSheet(previewFit!);
    reportPageCount();
  }

  // --- Static basics fields ----------------------------------------------
  function hydrateStaticFields(): void {
    form!
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]')
      .forEach((el) => {
        const key = el.dataset.field!.replace('basics.', '') as keyof ResumeData['basics'];
        el.value = data.basics[key] ?? '';
      });
  }

  // --- Repeatable sections ------------------------------------------------
  function itemCard(section: SectionKey, item: AnyItem, index: number): string {
    const record = item as unknown as Record<string, string>;
    const fields = SECTION_FIELDS[section]
      .map((spec) => fieldHtml(spec, String(record[spec.key] ?? '')))
      .join('');

    const label = SECTION_LABELS[section];
    const given = String(record[label.titleKey] ?? '').trim();
    const heading = given || `${label.singular} ${index + 1}`;

    return `<article class="rounded-xl border border-line bg-paper/60 p-4" data-section="${section}" data-item="${escAttr(item.id)}">
      <div class="mb-3.5 flex items-center justify-between gap-3">
        <span class="truncate text-xs font-semibold tracking-[-0.01em]">${escAttr(heading)}</span>
        <button type="button" data-remove class="flex-none rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-clay-soft hover:text-clay">Remove</button>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">${fields}</div>
    </article>`;
  }

  function renderSection(section: SectionKey): void {
    const host = form!.querySelector<HTMLElement>(`[data-list="${section}"]`);
    if (!host) return;

    const items = data[section] as AnyItem[];
    host.innerHTML = items.length
      ? items.map((item, index) => itemCard(section, item, index)).join('')
      : `<p class="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-faint">${SECTION_LABELS[section].empty}</p>`;

    const counter = document.querySelector<HTMLElement>(`[data-count="${section}"]`);
    if (counter) counter.textContent = items.length ? String(items.length) : '';
  }

  function renderAllSections(): void {
    SECTIONS.forEach(renderSection);
  }

  // --- Section rail -------------------------------------------------------
  const railButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-goto]'));
  const panelEls = Array.from(form.querySelectorAll<HTMLElement>('[data-panel]'));

  function showPanel(next: PanelKey): void {
    panel = next;
    panelEls.forEach((el) => {
      el.hidden = el.dataset.panel !== next;
    });
    railButtons.forEach((button) => {
      button.setAttribute('aria-current', String(button.dataset.goto === next));
    });
    form!.scrollTop = 0;
  }

  railButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showPanel(button.dataset.goto as PanelKey);
      // On a narrow screen the rail and the form share the viewport, so a tap
      // on a section should land on the form rather than leaving it offscreen.
      setView('edit');
    });
  });

  // --- Section headings: rename, remove, put back --------------------------
  // Each rail row owns its own menu. The server-rendered label is the app's
  // default name for the section; anything the user types replaces the heading
  // the template would otherwise have printed.
  const railRows = new Map<SectionKey, HTMLElement>();
  const defaultTitles = new Map<SectionKey, string>();

  document.querySelectorAll<HTMLElement>('[data-rail]').forEach((row) => {
    const key = row.dataset.rail as SectionKey;
    if (!SECTIONS.includes(key)) return;
    railRows.set(key, row);
    defaultTitles.set(key, row.querySelector('[data-rail-label]')?.textContent?.trim() ?? key);
  });

  const sectionMenus = Array.from(document.querySelectorAll<HTMLElement>('[data-section-panel]'));
  const sectionMenuButtons = Array.from(
    document.querySelectorAll<HTMLElement>('[data-section-menu]'),
  );

  function metaFor(key: SectionKey): SectionMeta {
    const sections = (data.sections ??= {});
    return (sections[key] ??= {});
  }

  /** Keeps storage to the sections the user has actually changed. */
  function pruneSections(): void {
    if (!data.sections) return;
    SECTIONS.forEach((key) => {
      const meta = data.sections![key];
      if (meta && !meta.label && !meta.hidden) delete data.sections![key];
    });
    if (!Object.keys(data.sections).length) delete data.sections;
  }

  /** The order in force: the user's arrangement, or the app's default. */
  function currentOrder(): SectionKey[] {
    return data.order?.length ? [...data.order] : [...SECTIONS];
  }

  /**
   * The rail lists sections in the order the sheet prints them, so a row that
   * moves takes its place in the list with it. Templates that keep a section
   * in a column of its own still reorder within that column, which is why the
   * rail is the thing that always shows the change.
   */
  function syncSectionOrder(): void {
    const order = currentOrder();
    const list = document.querySelector<HTMLElement>('.rail-list');

    // `basics` is not in the order and is never appended, so it stays first.
    order.forEach((key) => {
      const row = railRows.get(key);
      if (list && row) list.appendChild(row);
    });

    order.forEach((key, index) => {
      railRows
        .get(key)
        ?.querySelectorAll<HTMLButtonElement>('[data-section-move]')
        .forEach((button) => {
          button.disabled =
            button.dataset.direction === 'up' ? index === 0 : index === order.length - 1;
        });
    });
  }

  function moveSection(key: SectionKey, delta: number): void {
    const order = currentOrder();
    const from = order.indexOf(key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= order.length) return;

    order.splice(to, 0, ...order.splice(from, 1));
    // Back at the default is the same as never having arranged anything.
    if (order.every((entry, i) => entry === SECTIONS[i])) delete data.order;
    else data.order = order;

    syncSectionOrder();
    paintPreview();
    markSaved();

    // Moving the row detaches it, which drops focus. Put it back on the button
    // that was pressed so the section can be walked up the list with repeated
    // presses — or on its opposite once this one has run out of travel.
    const row = railRows.get(key);
    const moved = row?.querySelector<HTMLButtonElement>(
      `[data-section-move][data-direction="${delta < 0 ? 'up' : 'down'}"]`,
    );
    const fallback = row?.querySelector<HTMLButtonElement>(
      `[data-section-move][data-direction="${delta < 0 ? 'down' : 'up'}"]`,
    );
    (moved && !moved.disabled ? moved : fallback)?.focus();
  }

  function syncSectionHeadings(): void {
    SECTIONS.forEach((key) => {
      const row = railRows.get(key);
      if (!row) return;

      const meta = data.sections?.[key];
      const label = meta?.label?.trim() || defaultTitles.get(key) || key;
      const hidden = meta?.hidden === true;

      const labelEl = row.querySelector<HTMLElement>('[data-rail-label]');
      if (labelEl) labelEl.textContent = label;
      row.dataset.hidden = String(hidden);

      const toggleLabel = row.querySelector<HTMLElement>('[data-toggle-label]');
      if (toggleLabel) {
        toggleLabel.textContent = hidden ? 'Put back on the resume' : 'Remove from the resume';
      }

      const panelTitle = document.querySelector<HTMLElement>(`[data-panel-title="${key}"]`);
      if (panelTitle) panelTitle.textContent = label;
    });
  }

  function closeSectionMenus(): void {
    sectionMenus.forEach((menu) => {
      menu.hidden = true;
    });
    sectionMenuButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
  }

  function openSectionMenu(key: SectionKey): void {
    const button = document.querySelector<HTMLElement>(`[data-section-menu="${key}"]`);
    const menu = document.querySelector<HTMLElement>(`[data-section-panel="${key}"]`);
    if (!button || !menu) return;

    closeSectionMenus();
    closeMenus();
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');

    // The rail scrolls, so the menu is fixed and placed against the button.
    const rect = button.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8));
    const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - menu.offsetHeight - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  /** The heading exactly as the sheet is printing it, template wording and all. */
  function currentHeading(key: SectionKey): string {
    const override = data.sections?.[key]?.label?.trim();
    if (override) return override;
    const live = preview!.querySelector<HTMLElement>(`[data-e-open="${key}"] .rs-section-title`);
    return live?.textContent?.trim() || defaultTitles.get(key) || '';
  }

  function startRename(key: SectionKey): void {
    const row = railRows.get(key);
    if (!row || row.dataset.renaming === 'true') return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rail-rename';
    input.value = currentHeading(key);
    input.placeholder = defaultTitles.get(key) ?? '';
    input.setAttribute('aria-label', `Heading for ${defaultTitles.get(key) ?? key}`);

    row.dataset.renaming = 'true';
    row.appendChild(input);
    input.focus();
    input.select();

    let settled = false;

    const finish = (commit: boolean): void => {
      if (settled) return;
      settled = true;

      if (commit) {
        const next = input.value.trim();
        const meta = metaFor(key);
        // Emptied on purpose means "give me the template's own heading back".
        if (next) meta.label = next;
        else delete meta.label;
        pruneSections();
        syncSectionHeadings();
        paintPreview();
        markSaved();
      }

      delete row.dataset.renaming;
      input.remove();
    };

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });

    input.addEventListener('blur', () => finish(true));
  }

  sectionMenuButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.sectionMenu as SectionKey;
      const menu = document.querySelector<HTMLElement>(`[data-section-panel="${key}"]`);
      if (menu && !menu.hidden) closeSectionMenus();
      else openSectionMenu(key);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-section-move]').forEach((button) => {
    button.addEventListener('click', () => {
      closeSectionMenus();
      moveSection(
        button.dataset.sectionMove as SectionKey,
        button.dataset.direction === 'up' ? -1 : 1,
      );
    });
  });

  document.querySelectorAll<HTMLElement>('[data-section-rename]').forEach((button) => {
    button.addEventListener('click', () => {
      closeSectionMenus();
      startRename(button.dataset.sectionRename as SectionKey);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-section-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      closeSectionMenus();
      const key = button.dataset.sectionToggle as SectionKey;
      const meta = metaFor(key);
      if (meta.hidden) delete meta.hidden;
      else meta.hidden = true;
      pruneSections();
      syncSectionHeadings();
      paintPreview();
      markSaved();
    });
  });

  window.addEventListener('resize', closeSectionMenus);

  // --- Editing events -----------------------------------------------------
  form.addEventListener('input', (event) => {
    const el = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!el.dataset) return;

    const card = el.closest<HTMLElement>('[data-item]');
    if (card && el.dataset.key) {
      const section = card.dataset.section as SectionKey;
      const item = (data[section] as AnyItem[]).find((entry) => entry.id === card.dataset.item);
      if (!item) return;
      const record = item as unknown as Record<string, string | number>;
      record[el.dataset.key] = el.dataset.key === 'level' && section === 'skills'
        ? Number(el.value)
        : el.value;

      // Keep the card's own heading in step with the field that names it.
      if (el.dataset.key === SECTION_LABELS[section].titleKey) {
        const headingEl = card.querySelector<HTMLElement>('span');
        const index = (data[section] as AnyItem[]).indexOf(item);
        if (headingEl) {
          headingEl.textContent =
            el.value.trim() || `${SECTION_LABELS[section].singular} ${index + 1}`;
        }
      }
    } else if (el.dataset.field?.startsWith('basics.')) {
      const key = el.dataset.field.replace('basics.', '') as keyof ResumeData['basics'];
      data.basics[key] = el.value;
    } else {
      return;
    }

    paintPreview();
    markSaved();
  });

  form.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const addBtn = target.closest<HTMLElement>('[data-add]');
    if (addBtn) {
      const section = addBtn.dataset.add as SectionKey;
      (data[section] as AnyItem[]).push(blankItem(section) as never);
      renderSection(section);
      paintPreview();
      markSaved();
      // Drop the caret straight into the new card's first field.
      const cards = form!.querySelectorAll<HTMLElement>(`[data-list="${section}"] [data-item]`);
      cards[cards.length - 1]?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }

    const removeBtn = target.closest<HTMLElement>('[data-remove]');
    if (removeBtn) {
      const card = removeBtn.closest<HTMLElement>('[data-item]')!;
      const section = card.dataset.section as SectionKey;
      data[section] = (data[section] as AnyItem[]).filter(
        (entry) => entry.id !== card.dataset.item,
      ) as never;
      renderSection(section);
      paintPreview();
      markSaved();
    }
  });

  // --- Click the page, edit the field -------------------------------------
  let flashTimer: number | undefined;

  function flash(el: HTMLElement): void {
    window.clearTimeout(flashTimer);
    preview!.querySelectorAll('.is-target').forEach((node) => node.classList.remove('is-target'));
    el.classList.add('is-target');
    flashTimer = window.setTimeout(() => el.classList.remove('is-target'), 1400);
  }

  function focusControl(control: HTMLElement | null): void {
    if (!control) return;
    control.scrollIntoView({ block: 'center', behavior: 'smooth' });
    control.focus({ preventScroll: true });
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      control.select();
    }
  }

  /** Maps a `section|id|key` (or `basics|key`) address onto its form control. */
  function openAddress(address: string): void {
    const parts = address.split('|');

    if (parts[0] === 'basics') {
      showPanel('basics');
      focusControl(form!.querySelector<HTMLElement>(`[data-field="basics.${parts[1]}"]`));
      return;
    }

    const [sectionRaw, itemId, key] = parts;
    const section = sectionRaw as SectionKey;
    if (!SECTIONS.includes(section)) return;

    showPanel(section);
    const card = form!.querySelector<HTMLElement>(`[data-item="${CSS.escape(itemId)}"]`);
    if (!card) return;
    // The control is inside the card, so centring it brings the card with it.
    focusControl(
      card.querySelector<HTMLElement>(`[data-key="${key}"]`) ??
        card.querySelector<HTMLElement>('[data-key]'),
    );
  }

  // Double-click, not single: a stray click on the page while reading should
  // never yank the form to another field. Links are the exception — they open
  // on a single click, the way a link anywhere else does.
  preview.addEventListener('dblclick', (event) => {
    const target = event.target as HTMLElement;

    // A real link stays a link.
    if (target.closest('a')) return;

    const field = target.closest<HTMLElement>('[data-e]');
    if (field) {
      event.preventDefault();
      setView('edit');
      flash(field);
      openAddress(field.dataset.e!);
      return;
    }

    const opener = target.closest<HTMLElement>('[data-e-open]');
    if (opener) {
      event.preventDefault();
      setView('edit');
      showPanel(opener.dataset.eOpen as PanelKey);
    }
  });

  // --- Dropdown menus -----------------------------------------------------
  const menus = Array.from(document.querySelectorAll<HTMLElement>('[data-menu]'));

  function closeMenus(except?: HTMLElement): void {
    menus.forEach((menu) => {
      if (menu === except) return;
      menu.querySelector<HTMLElement>('[data-menu-panel]')!.hidden = true;
      menu.querySelector<HTMLElement>('[data-menu-button]')!.setAttribute('aria-expanded', 'false');
    });
  }

  menus.forEach((menu) => {
    const button = menu.querySelector<HTMLElement>('[data-menu-button]')!;
    const panelEl = menu.querySelector<HTMLElement>('[data-menu-panel]')!;
    button.addEventListener('click', () => {
      const open = panelEl.hidden;
      closeMenus(menu);
      panelEl.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-menu]')) closeMenus();
    if (!target.closest('[data-section-menu]') && !target.closest('[data-section-panel]')) {
      closeSectionMenus();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeMenus();
    closeSectionMenus();
  });

  // --- Template switching -------------------------------------------------
  const templateButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-template]'),
  );
  const templateLabel = document.querySelector<HTMLElement>('[data-template-label]');

  function syncTemplateButtons(): void {
    templateButtons.forEach((button) => {
      const active = button.dataset.template === template;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('bg-paper-sunk', active);
      const tick = button.querySelector<HTMLElement>('[data-template-tick]');
      if (tick) {
        tick.classList.toggle('bg-ink', active);
        tick.classList.toggle('border-ink', active);
      }
      if (active && templateLabel) {
        templateLabel.textContent = button.dataset.templateName ?? '';
      }
    });
  }

  templateButtons.forEach((button) => {
    button.addEventListener('click', () => {
      template = resolveTemplate(button.dataset.template);
      saveTemplate(template);
      syncTemplateButtons();
      paintPreview();
      closeMenus();
    });
  });

  // --- Accent colour ------------------------------------------------------
  const accentButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-accent]'));
  const accentDot = document.querySelector<HTMLElement>('[data-accent-dot]');

  function syncAccentButtons(): void {
    accentButtons.forEach((button) => {
      const active = button.dataset.accent === accent;
      button.setAttribute('aria-pressed', String(active));
      button
        .querySelector<HTMLElement>('[data-accent-tick]')
        ?.classList.toggle('opacity-0', !active);
    });
    if (accentDot) accentDot.style.background = resolveAccent(accent).hex;
  }

  accentButtons.forEach((button) => {
    button.addEventListener('click', () => {
      accent = resolveAccent(button.dataset.accent).id;
      saveAccent(accent);
      syncAccentButtons();
      paintPreview();
    });
  });

  // --- Resizable split ----------------------------------------------------
  const splitter = document.querySelector<HTMLElement>('[data-splitter]');
  const formPane = form;
  let split = loadSplit();

  function applySplit(): void {
    grid!.style.setProperty('--split', `${split}rem`);
    fitSheet(previewFit!);
  }

  function setSplit(next: number): void {
    split = clampSplit(next);
    applySplit();
    saveSplit(split);
  }

  if (splitter) {
    splitter.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      splitter.setPointerCapture(event.pointerId);
      splitter.dataset.dragging = 'true';
      document.body.dataset.resizing = 'true';
    });

    splitter.addEventListener('pointermove', (event) => {
      if (splitter.dataset.dragging !== 'true') return;
      const left = formPane.getBoundingClientRect().left;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setSplit((event.clientX - left) / rem);
    });

    const endDrag = (event: PointerEvent) => {
      if (splitter.dataset.dragging !== 'true') return;
      splitter.dataset.dragging = 'false';
      delete document.body.dataset.resizing;
      if (splitter.hasPointerCapture(event.pointerId)) {
        splitter.releasePointerCapture(event.pointerId);
      }
    };

    splitter.addEventListener('pointerup', endDrag);
    splitter.addEventListener('pointercancel', endDrag);

    splitter.addEventListener('dblclick', () => setSplit(SPLIT_DEFAULT));

    splitter.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSplit(split - (event.shiftKey ? 4 : 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSplit(split + (event.shiftKey ? 4 : 1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setSplit(SPLIT_DEFAULT);
      }
    });
  }

  // --- Reset --------------------------------------------------------------
  document.querySelector<HTMLElement>('[data-clear]')?.addEventListener('click', () => {
    const ok = window.confirm('Clear every field and start from a blank resume?');
    if (!ok) return;
    data = structuredClone(EMPTY_RESUME);
    hydrateStaticFields();
    renderAllSections();
    syncSectionHeadings();
    syncSectionOrder();
    paintPreview();
    markSaved();
  });

  // --- Download -----------------------------------------------------------
  const originalTitle = document.title;

  document.querySelectorAll<HTMLElement>('[data-download]').forEach((button) => {
    button.addEventListener('click', () => {
      printRoot!.innerHTML = `<div class="${sheetClass(template)}" style="${sheetStyle(accent)}">${renderResume(data, template)}</div>`;
      // Browsers seed the "Save as PDF" filename from the document title.
      const name = data.basics.fullName.trim();
      document.title = name ? `${name} — Resume` : 'Resume';
      window.print();
    });
  });

  window.addEventListener('afterprint', () => {
    document.title = originalTitle;
    printRoot!.innerHTML = '';
  });

  // --- Mobile edit/preview toggle ----------------------------------------
  const viewRoot = document.querySelector<HTMLElement>('[data-view-root]');
  const viewButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-view]'));

  function setView(view: string): void {
    viewRoot?.setAttribute('data-active-view', view);
    viewButtons.forEach((button) => {
      const active = button.dataset.view === view;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('bg-surface', active);
      button.classList.toggle('shadow-sm', active);
      button.classList.toggle('text-ink', active);
      button.classList.toggle('text-ink-muted', !active);
    });
    if (view === 'preview') fitSheet(previewFit!);
  }

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view!));
  });

  // --- Boot ---------------------------------------------------------------
  hydrateStaticFields();
  renderAllSections();
  syncSectionHeadings();
  syncSectionOrder();
  syncTemplateButtons();
  syncAccentButtons();
  showPanel('basics');
  applySplit();
  paintPreview();
  new ResizeObserver(() => fitSheet(previewFit)).observe(previewFit);
  if (statusEl) statusEl.textContent = 'Saved to this browser';
}

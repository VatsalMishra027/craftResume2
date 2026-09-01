import { renderResume, sheetClass } from '../lib/render';
import { loadResume, loadTemplate, saveResume, saveTemplate, uid, EMPTY_RESUME } from '../lib/store';
import { resolveTemplate } from '../lib/templates';
import { fitSheet } from '../lib/fit';
import type { EducationItem, ExperienceItem, ProjectItem, ResumeData, SectionKey } from '../lib/types';

type AnyItem = ExperienceItem | EducationItem | ProjectItem;

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
  /** Grid columns the control should span inside the two-column card. */
  full?: boolean;
  hint?: string;
}

function fieldHtml(spec: FieldSpec, value: string): string {
  const control =
    spec.rows && spec.rows > 0
      ? `<textarea data-key="${spec.key}" rows="${spec.rows}" placeholder="${escAttr(spec.placeholder ?? '')}" class="${CONTROL} resize-y leading-relaxed">${escAttr(value)}</textarea>`
      : `<input data-key="${spec.key}" type="text" value="${escAttr(value)}" placeholder="${escAttr(spec.placeholder ?? '')}" class="${CONTROL}" />`;

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
  ],
};

const SECTION_LABELS: Record<SectionKey, { singular: string; empty: string }> = {
  experience: { singular: 'Role', empty: 'No roles yet. Add your most recent job first.' },
  education: { singular: 'Qualification', empty: 'No education added yet.' },
  projects: { singular: 'Project', empty: 'Optional. Useful when your side work is the strongest evidence.' },
};

function blankItem(section: SectionKey): AnyItem {
  if (section === 'experience') {
    return { id: uid('exp'), role: '', company: '', location: '', start: '', end: '', bullets: '' };
  }
  if (section === 'education') {
    return { id: uid('edu'), degree: '', school: '', location: '', start: '', end: '', note: '' };
  }
  return { id: uid('prj'), name: '', link: '', description: '' };
}

export function initEditor(): void {
  const form = document.querySelector<HTMLElement>('[data-editor-form]');
  const preview = document.querySelector<HTMLElement>('[data-preview]');
  const previewFit = document.querySelector<HTMLElement>('[data-sheet-fit="flow"]');
  const printRoot = document.querySelector<HTMLElement>('.print-root');
  if (!form || !preview || !previewFit || !printRoot) return;

  const params = new URLSearchParams(location.search);
  let data: ResumeData = loadResume();
  let template = params.has('template') ? resolveTemplate(params.get('template')) : loadTemplate();
  saveTemplate(template);

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
    preview.className = sheetClass(template);
    preview.innerHTML = renderResume(data, template);
    fitSheet(previewFit!);
    reportPageCount();
  }

  // --- Static basics + skills fields -------------------------------------
  function hydrateStaticFields(): void {
    form!.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]').forEach((el) => {
      const path = el.dataset.field!;
      if (path === 'skills') {
        el.value = data.skills;
        return;
      }
      const key = path.replace('basics.', '') as keyof ResumeData['basics'];
      el.value = data.basics[key] ?? '';
    });
  }

  // --- Repeatable sections ------------------------------------------------
  function itemCard(section: SectionKey, item: AnyItem, index: number): string {
    const record = item as unknown as Record<string, string>;
    const fields = SECTION_FIELDS[section]
      .map((spec) => fieldHtml(spec, record[spec.key] ?? ''))
      .join('');

    return `<article class="rounded-xl border border-line bg-paper/60 p-4" data-section="${section}" data-item="${escAttr(item.id)}">
      <div class="mb-3.5 flex items-center justify-between gap-3">
        <span class="text-xs font-semibold tracking-[-0.01em]">${SECTION_LABELS[section].singular} ${index + 1}</span>
        <button type="button" data-remove class="rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-clay-soft hover:text-clay">Remove</button>
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
  }

  function renderAllSections(): void {
    (['experience', 'education', 'projects'] as SectionKey[]).forEach(renderSection);
  }

  // --- Events -------------------------------------------------------------
  form.addEventListener('input', (event) => {
    const el = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!el.dataset) return;

    const card = el.closest<HTMLElement>('[data-item]');
    if (card && el.dataset.key) {
      const section = card.dataset.section as SectionKey;
      const item = (data[section] as AnyItem[]).find((entry) => entry.id === card.dataset.item);
      if (item) (item as unknown as Record<string, string>)[el.dataset.key] = el.value;
    } else if (el.dataset.field === 'skills') {
      data.skills = el.value;
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

  // --- Template switching -------------------------------------------------
  const templateButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-template]'),
  );

  function syncTemplateButtons(): void {
    templateButtons.forEach((button) => {
      const active = button.dataset.template === template;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('bg-ink', active);
      button.classList.toggle('text-paper', active);
      button.classList.toggle('text-ink-soft', !active);
    });
  }

  templateButtons.forEach((button) => {
    button.addEventListener('click', () => {
      template = resolveTemplate(button.dataset.template);
      saveTemplate(template);
      syncTemplateButtons();
      paintPreview();
    });
  });

  // --- Reset --------------------------------------------------------------
  document.querySelector<HTMLElement>('[data-clear]')?.addEventListener('click', () => {
    const ok = window.confirm('Clear every field and start from a blank resume?');
    if (!ok) return;
    data = structuredClone(EMPTY_RESUME);
    hydrateStaticFields();
    renderAllSections();
    paintPreview();
    markSaved();
  });

  // --- Download -----------------------------------------------------------
  const originalTitle = document.title;

  document.querySelectorAll<HTMLElement>('[data-download]').forEach((button) => {
    button.addEventListener('click', () => {
      printRoot!.innerHTML = `<div class="${sheetClass(template)}">${renderResume(data, template)}</div>`;
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
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view!;
      viewRoot?.setAttribute('data-active-view', view);
      document.querySelectorAll<HTMLElement>('[data-view]').forEach((other) => {
        const active = other.dataset.view === view;
        other.setAttribute('aria-pressed', String(active));
        other.classList.toggle('bg-surface', active);
        other.classList.toggle('shadow-sm', active);
        other.classList.toggle('text-ink', active);
        other.classList.toggle('text-ink-muted', !active);
      });
      if (view === 'preview') fitSheet(previewFit!);
    });
  });

  // --- Boot ---------------------------------------------------------------
  hydrateStaticFields();
  renderAllSections();
  syncTemplateButtons();
  paintPreview();
  new ResizeObserver(() => fitSheet(previewFit)).observe(previewFit);
  if (statusEl) statusEl.textContent = 'Saved to this browser';
}

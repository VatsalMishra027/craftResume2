/**
 * The cover letter editor.
 *
 * A sibling of the resume editor rather than a mode of it: same workbench,
 * same stored draft, one document. It owns `coverLetter`, the letter format
 * and the contact block, and merges everything else back from storage on every
 * save — see markSaved — so the two editors can be open in two tabs without
 * rolling each other back.
 *
 * The format comes from the letter's own gallery and is stored apart from the
 * resume's template. The accent and the typeface are shared, which is what
 * makes the two documents arrive looking like one application.
 */
import { letterClass, renderCoverLetter, sheetStyle } from '../lib/render';
import {
  EMPTY_COVER_LETTER,
  SPLIT_DEFAULT,
  clampSplit,
  loadAccent,
  loadFont,
  loadFontSize,
  loadLetter,
  loadResume,
  loadSplit,
  saveAccent,
  saveFont,
  saveFontSize,
  saveLetter,
  saveResume,
  saveSplit,
} from '../lib/store';
import { resolveAccent } from '../lib/templates';
import { resolveLetter } from '../lib/letters';
import {
  buildCoverLetterDocx,
  buildCoverLetterText,
  copyText,
  downloadBlob,
  exportFilename,
} from '../lib/export';
import { fitSheet } from '../lib/fit';
import { initTypeMenu } from './type-menu';
import type { CoverLetter, CoverPanelKey, ResumeData } from '../lib/types';

/** Which part of the letter each field belongs to, for click-to-edit. */
const PANEL_FOR_COVER_FIELD: Record<keyof CoverLetter, CoverPanelKey> = {
  recipient: 'recipient',
  recipientTitle: 'recipient',
  company: 'recipient',
  companyAddress: 'recipient',
  role: 'recipient',
  date: 'recipient',
  greeting: 'letter',
  body: 'letter',
  signOff: 'letter',
};

export function initCoverEditor(): void {
  const form = document.querySelector<HTMLElement>('[data-editor-form]');
  const preview = document.querySelector<HTMLElement>('[data-preview]');
  const previewFit = document.querySelector<HTMLElement>('[data-sheet-fit="flow"]');
  const printRoot = document.querySelector<HTMLElement>('.print-root');
  const grid = document.querySelector<HTMLElement>('.editor-grid');
  if (!form || !preview || !previewFit || !printRoot || !grid) return;

  const params = new URLSearchParams(location.search);
  const data: ResumeData = loadResume();
  // `?letter=` is how the formats gallery hands a choice over. The accent and
  // the typeface are shared with the resume; the format is the letter's own.
  let letterId = params.has('letter') ? resolveLetter(params.get('letter')) : loadLetter();
  let accent = params.has('accent') ? resolveAccent(params.get('accent')).id : loadAccent();
  let font = loadFont();
  let fontSize = loadFontSize();

  saveLetter(letterId);
  saveAccent(accent);

  // The choice is stored now, so leave a clean URL behind — a reload should
  // not re-apply a format the user has since changed.
  if (params.has('letter')) {
    const url = new URL(location.href);
    url.searchParams.delete('letter');
    history.replaceState(null, '', url);
  }

  /** The letter, created on first use rather than carried by every draft. */
  function letter(): CoverLetter {
    return (data.coverLetter ??= { ...EMPTY_COVER_LETTER });
  }

  // --- Saving -------------------------------------------------------------
  let saveTimer: number | undefined;
  const statusEl = document.querySelector<HTMLElement>('[data-save-status]');

  function markSaved(): void {
    window.clearTimeout(saveTimer);
    if (statusEl) statusEl.textContent = 'Saving…';
    saveTimer = window.setTimeout(() => {
      // Both editors write the one stored draft, and this one owns exactly two
      // things: the letter, and the contact block it shares with the resume.
      // Everything else — the sections, and the headshot the resume editor
      // uploads — is merged back from whatever is stored now, so writing a
      // letter can never roll the resume back to how it looked when this page
      // was opened.
      const stored = loadResume();
      stored.basics = { ...data.basics, photo: stored.basics.photo };
      stored.coverLetter = data.coverLetter;

      const result = saveResume(stored);
      if (!statusEl) return;
      statusEl.textContent =
        result === 'failed' ? 'Could not save to this browser' : 'Saved to this browser';
    }, 400);
  }

  // --- Preview ------------------------------------------------------------
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

  function sheetType(): { font: string; size: string } {
    return { font, size: fontSize };
  }

  function paintPreview(): void {
    preview!.className = `${letterClass(letterId)} resume-sheet--live`;
    preview!.setAttribute('style', sheetStyle(accent, sheetType()));
    preview!.innerHTML = renderCoverLetter(data, letterId);
    fitSheet(previewFit!);
    reportPageCount();
  }

  // --- Fields -------------------------------------------------------------
  function hydrateFields(): void {
    form!
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]')
      .forEach((el) => {
        const field = el.dataset.field!;
        if (field.startsWith('cover.')) {
          el.value = letter()[field.slice(6) as keyof CoverLetter] ?? '';
        } else {
          el.value = data.basics[field.replace('basics.', '') as keyof ResumeData['basics']] ?? '';
        }
      });
  }

  form.addEventListener('input', (event) => {
    const el = event.target as HTMLInputElement | HTMLTextAreaElement;
    const field = el.dataset?.field;
    if (!field) return;

    if (field.startsWith('cover.')) {
      letter()[field.slice(6) as keyof CoverLetter] = el.value;
    } else if (field.startsWith('basics.')) {
      data.basics[field.replace('basics.', '') as keyof ResumeData['basics']] = el.value;
      if (field === 'basics.fullName') {
        syncDocumentTitle();
      }
    } else {
      return;
    }

    paintPreview();
    markSaved();
  });

  // --- The rail -----------------------------------------------------------
  const railButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-goto]'));
  const panelEls = Array.from(form.querySelectorAll<HTMLElement>('[data-panel]'));

  function showPanel(next: CoverPanelKey): void {
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
      showPanel(button.dataset.goto as CoverPanelKey);
      setView('edit');
    });
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

  /** Maps a `cover|key` or `basics|key` address onto its form control. */
  function openAddress(address: string): void {
    const [group, key] = address.split('|');

    if (group === 'basics') {
      // The letterhead is the resume's contact block, so a click on it opens
      // "Your details" rather than sending the user to the other editor.
      showPanel('sender');
      focusControl(form!.querySelector<HTMLElement>(`[data-field="basics.${key}"]`));
      return;
    }

    if (group !== 'cover') return;
    showPanel(PANEL_FOR_COVER_FIELD[key as keyof CoverLetter] ?? 'letter');
    focusControl(form!.querySelector<HTMLElement>(`[data-field="cover.${key}"]`));
  }

  // Double-click, not single: a stray click while reading should never yank
  // the form to another field.
  preview.addEventListener('dblclick', (event) => {
    const target = event.target as HTMLElement;
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
      showPanel('sender');
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
    if (!(event.target as HTMLElement).closest('[data-menu]')) closeMenus();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus();
  });

  // --- Format, colour, type -----------------------------------------------
  const letterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-letter]'));
  const letterLabel = document.querySelector<HTMLElement>('[data-letter-label]');

  function syncLetterButtons(): void {
    letterButtons.forEach((button) => {
      const active = button.dataset.letter === letterId;
      button.setAttribute('aria-pressed', String(active));
      const tick = button.querySelector<HTMLElement>('[data-letter-tick]');
      if (tick) {
        tick.classList.toggle('bg-ink', active);
        tick.classList.toggle('border-ink', active);
      }
      if (active && letterLabel) letterLabel.textContent = button.dataset.letterName ?? '';
    });
  }

  letterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      letterId = resolveLetter(button.dataset.letter);
      saveLetter(letterId);
      syncLetterButtons();
      paintPreview();
      closeMenus();
    });
  });

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

  initTypeMenu({
    font: () => font,
    size: () => fontSize,
    onChange: (nextFont, nextSize) => {
      font = nextFont;
      fontSize = nextSize;
      saveFont(font);
      saveFontSize(fontSize);
      paintPreview();
    },
  });

  // --- Resizable split ----------------------------------------------------
  const splitter = document.querySelector<HTMLElement>('[data-splitter]');
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
      const left = form!.getBoundingClientRect().left;
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

  /* --- Download -------------------------------------------------------------
     The letter on its own. The resume has its own editor and its own download,
     and the switch there is what staples the two together.
  --------------------------------------------------------------------------- */
  const copyLabel = document.querySelector<HTMLElement>('[data-copy-label]');

  function syncDocumentTitle(): void {
    const name = data.basics.fullName.replace(/[\\/:*?"<>|]/g, '').trim();
    document.title = name ? `${name} - Cover Letter` : 'Cover Letter';
  }

  function printLetter(): void {
    printRoot!.innerHTML = `<div class="${letterClass(letterId)}" style="${sheetStyle(
      accent,
      sheetType(),
    )}">${renderCoverLetter(data, letterId)}</div>`;

    // Browsers seed the "Save as PDF" filename from the document title.
    syncDocumentTitle();
    window.print();
  }

  let copyTimer: number | undefined;

  async function copyLetter(): Promise<void> {
    const ok = await copyText(buildCoverLetterText(data));
    if (!copyLabel) return;
    window.clearTimeout(copyTimer);
    copyLabel.textContent = ok ? 'Copied to the clipboard' : 'Could not copy — select and copy';
    copyTimer = window.setTimeout(() => {
      copyLabel.textContent = 'Copy all the text';
    }, 2200);
  }

  document.querySelectorAll<HTMLElement>('[data-download]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.download;
      if (kind === 'docx') {
        downloadBlob(
          buildCoverLetterDocx(data, resolveAccent(accent).hex),
          exportFilename(data, 'docx', 'Cover-Letter'),
        );
        closeMenus();
      } else if (kind === 'copy') {
        // The menu stays open so the "Copied" confirmation is actually seen.
        void copyLetter();
      } else {
        printLetter();
        closeMenus();
      }
    });
  });

  window.addEventListener('afterprint', () => {
    syncDocumentTitle();
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

  // --- Letter helpers -----------------------------------------------------
  document.querySelector<HTMLElement>('[data-letter-date]')?.addEventListener('click', () => {
    letter().date = new Date().toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const field = form.querySelector<HTMLInputElement>('[data-field="cover.date"]');
    if (field) field.value = letter().date;
    paintPreview();
    markSaved();
  });

  // Clears the letter and nothing else: the resume is a separate document and
  // is not the user's to lose from in here.
  document.querySelector<HTMLElement>('[data-letter-reset]')?.addEventListener('click', () => {
    if (!window.confirm('Clear this cover letter and start from a blank one?')) return;
    data.coverLetter = { ...EMPTY_COVER_LETTER };
    hydrateFields();
    paintPreview();
    markSaved();
  });

  // --- Boot ---------------------------------------------------------------
  hydrateFields();
  syncLetterButtons();
  syncAccentButtons();
  syncDocumentTitle();
  showPanel('letter');
  applySplit();
  paintPreview();

  new ResizeObserver(() => fitSheet(previewFit)).observe(previewFit);
  if (statusEl) statusEl.textContent = 'Saved to this browser';
}

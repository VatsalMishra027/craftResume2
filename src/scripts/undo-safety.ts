/**
 * A safety net for the actions that replace a whole resume at once: "Clear
 * everything", applying an imported PDF, and loading a role blueprint.
 *
 * Just before one of them runs, the resume as last saved is copied into a
 * separate backup. A banner then offers to put it back, and keeps offering —
 * across refreshes — until it is used or dismissed. It listens from outside
 * and never touches the editor's own handlers: the editor clears, imports and
 * loads exactly as it did before, this only keeps a copy first.
 */
import { sampleFor } from '../lib/sample';
import { hasSavedResume, loadResume, loadTemplate, saveResume } from '../lib/store';
import type { ResumeData } from '../lib/types';

const KEY = 'craftresume:backup:v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface Backup {
  at: number;
  reason: string;
  data: ResumeData;
}

function isBlank(data: ResumeData): boolean {
  const b = data.basics;
  const lists = [
    data.experience,
    data.education,
    data.projects,
    data.skills,
    data.languages,
    data.certifications,
    data.publications,
    data.interests,
    data.customSections,
  ];
  return (
    !b.fullName.trim() &&
    !b.title.trim() &&
    !b.email.trim() &&
    !b.summary.trim() &&
    lists.every((list) => !list || list.length === 0)
  );
}

function readBackup(): Backup | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Backup;
    if (!parsed?.data?.basics || typeof parsed.at !== 'number') return null;
    if (Date.now() - parsed.at > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeBackup(backup: Backup): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(backup));
    return;
  } catch {
    /* Probably the photo pushed it over the quota; retry without it. */
  }
  try {
    const lean = { ...backup, data: { ...backup.data, basics: { ...backup.data.basics, photo: '' } } };
    localStorage.setItem(KEY, JSON.stringify(lean));
  } catch {
    /* No room at all: carry on without a backup rather than break the action. */
  }
}

/** Copies the saved resume aside — unless there is nothing worth keeping. */
function snapshot(reason: string): void {
  try {
    if (!hasSavedResume()) return;
    const data = loadResume();
    if (isBlank(data)) return;
    writeBackup({ at: Date.now(), reason, data });
  } catch {
    /* Storage unavailable: nothing to protect. */
  }
}

function ago(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/**
 * Takes the copy only if the person says yes. The editor asks "are you sure?"
 * with window.confirm before clearing or loading a blueprint; for that one
 * question the answer is passed through untouched and, on yes, the copy is
 * taken before the editor carries on and wipes the draft. Saying no leaves no
 * backup and no banner.
 */
function snapshotIfConfirmed(reason: string): void {
  const original = window.confirm;
  const restore = () => {
    if (window.confirm !== original) window.confirm = original;
  };
  window.confirm = (message?: string) => {
    restore();
    const answer = original.call(window, message);
    if (answer) snapshot(reason);
    return answer;
  };
  window.setTimeout(restore, 0);
}

/**
 * Puts the demo resume for the current layout back — the same one a first
 * visit opens on. If there is real work in the draft it asks first and keeps a
 * copy, so this is undoable like everything else here.
 */
function fillDemo(): void {
  const current = hasSavedResume() ? loadResume() : null;
  if (current && !isBlank(current)) {
    if (!window.confirm('Replace your resume with the demo data? You can undo this.')) return;
    snapshot('Replaced with demo data');
  }
  if (saveResume(structuredClone(sampleFor(loadTemplate()))) === 'failed') {
    window.alert('Could not fill the demo data: browser storage is full.');
    return;
  }
  location.reload();
}

export function initUndoSafety(): void {
  // A role blueprint replaces the draft while the editor boots, so this has to
  // be armed before it runs.
  if (new URLSearchParams(location.search).has('blueprint')) {
    snapshotIfConfirmed('Replaced by a role blueprint');
  }

  document.addEventListener(
    'click',
    (event) => {
      const t = event.target as HTMLElement;
      if (t.closest('[data-clear]')) snapshotIfConfirmed('Cleared everything');
      // Applying an import comes after a preview the person has already read.
      else if (t.closest('[data-modal-apply]')) snapshot('Replaced by an imported resume');
    },
    true,
  );

  const banner = document.createElement('div');
  banner.className = 'undo-banner';
  banner.setAttribute('role', 'status');
  banner.hidden = true;
  banner.innerHTML = `
    <span class="undo-text"></span>
    <button type="button" class="undo-restore" data-undo-restore>Undo</button>
    <button type="button" class="undo-demo" data-undo-demo hidden>Use demo data</button>
    <button type="button" class="undo-dismiss" data-undo-dismiss aria-label="Dismiss">&times;</button>`;
  document.body.appendChild(banner);
  const text = banner.querySelector<HTMLElement>('.undo-text')!;
  const demoBtn = banner.querySelector<HTMLButtonElement>('[data-undo-demo]')!;

  function render(): void {
    const backup = readBackup();
    // After a restore the saved draft equals the backup; nothing left to offer.
    banner.hidden = !backup;
    if (backup) text.textContent = `${backup.reason} · saved ${ago(backup.at)}`;
    // Offer the demo only while the draft is actually empty.
    try {
      demoBtn.hidden = !(hasSavedResume() && isBlank(loadResume()));
    } catch {
      demoBtn.hidden = true;
    }
  }

  demoBtn.addEventListener('click', fillDemo);
  document.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-demo-fill]')) fillDemo();
  });

  banner.querySelector('[data-undo-restore]')!.addEventListener('click', () => {
    const backup = readBackup();
    if (!backup) return;
    if (saveResume(backup.data) === 'failed') {
      text.textContent = 'Could not restore: browser storage is full';
      return;
    }
    localStorage.removeItem(KEY);
    location.reload();
  });

  banner.querySelector('[data-undo-dismiss]')!.addEventListener('click', () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* Nothing to remove. */
    }
    banner.hidden = true;
  });

  // The action runs on the same click, a moment after the capture listener;
  // checking on the next tick shows the banner as soon as the backup exists.
  // The editor saves 0.4s after a change, so look again once that has landed.
  document.addEventListener('click', () => {
    window.setTimeout(render, 0);
    window.setTimeout(render, 700);
  });
  window.addEventListener('storage', render);
  render();
}

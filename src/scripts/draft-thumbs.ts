/**
 * Making a gallery card show the page the editor will actually open.
 *
 * The cards are rendered on the server, where the only content there is to
 * render is the shared sample — so a visitor who already has a draft saw
 * Ananya Rao on the card and their own name a click later. Two different
 * documents in two consecutive screens reads as a bug, and it is: the card is
 * meant to be a preview, not an advert.
 *
 * So once the page has run, any card still showing the sample is repainted
 * with the saved draft, in the saved accent and the saved type. There is no
 * flash of the wrong resume — the server render is what fills the card until
 * this replaces it, and a visitor with nothing saved keeps the sample, which
 * is then exactly what their editor opens too.
 */
import { letterClass, renderCoverLetter, renderResume, sheetClass, sheetStyle } from '../lib/render';
import { hasSavedResume, loadAccent, loadFont, loadFontSize, loadResume } from '../lib/store';
import { fitSheet } from '../lib/fit';
import type { ResumeData } from '../lib/types';

/** The saved draft, or null when this browser has never saved one. */
function savedDraft(): ResumeData | null {
  try {
    return hasSavedResume() ? loadResume() : null;
  } catch {
    return null;
  }
}

/** How the editor would typeset it, so the card and the editor agree. */
function style(): string {
  return sheetStyle(loadAccent(), { font: loadFont(), size: loadFontSize() });
}

function refit(sheet: HTMLElement): void {
  const container = sheet.closest<HTMLElement>('[data-sheet-fit]');
  if (container) fitSheet(container);
}

/**
 * Repaints every resume card that is showing the sample. Returns true when a
 * draft was found, so the caller can say whose resume is on the cards.
 */
export function paintResumeThumbs(root: ParentNode = document): boolean {
  const draft = savedDraft();
  if (!draft) return false;

  const sheetStyleValue = style();
  root.querySelectorAll<HTMLElement>('[data-template-sheet]').forEach((sheet) => {
    const id = sheet.dataset.templateSheet!;
    sheet.className = sheetClass(id);
    sheet.setAttribute('style', sheetStyleValue);
    sheet.innerHTML = renderResume(draft, id, { links: false });
    refit(sheet);
  });

  return true;
}

/** The same, for the cover letter formats. */
export function paintLetterThumbs(root: ParentNode = document): boolean {
  const draft = savedDraft();
  // An empty letter would repaint every card as the same blank page, which is
  // a worse preview than the sample. The words have to exist first.
  if (!draft?.coverLetter?.body.trim()) return false;

  const sheetStyleValue = style();
  root.querySelectorAll<HTMLElement>('[data-letter-sheet]').forEach((sheet) => {
    const id = sheet.dataset.letterSheet!;
    sheet.className = letterClass(id);
    sheet.setAttribute('style', sheetStyleValue);
    sheet.innerHTML = renderCoverLetter(draft, id);
    refit(sheet);
  });

  return true;
}

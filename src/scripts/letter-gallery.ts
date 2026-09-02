/**
 * The cover letter formats page: one category filter over a grid rendered on
 * the server, so the page is a plain list of letters before this runs.
 */
import { fitSheet } from '../lib/fit';
import { paintLetterThumbs } from './draft-thumbs';

export function initLetterGallery(): void {
  const root = document.querySelector<HTMLElement>('[data-letter-gallery]');
  if (!root) return;

  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
  const filters = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  const emptyNote = root.querySelector<HTMLElement>('[data-empty]');
  const draftNote = root.querySelector<HTMLElement>('[data-draft-note]');

  // Whatever this visitor has already written, in place of the sample.
  if (paintLetterThumbs(root) && draftNote) draftNote.hidden = false;

  let active = 'all';

  function apply(): void {
    let shown = 0;

    cards.forEach((card) => {
      const match = active === 'all' || card.dataset.category === active;
      card.hidden = !match;
      if (!match) return;
      shown += 1;
      // A sheet inside a hidden card measures zero, so it has to be re-fitted
      // the moment it comes back or it renders at the wrong scale.
      card.querySelectorAll<HTMLElement>('[data-sheet-fit]').forEach(fitSheet);
    });

    if (emptyNote) emptyNote.hidden = shown > 0;
    filters.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === active));
    });
  }

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      active = button.dataset.filter ?? 'all';
      apply();
    });
  });

  apply();
}

/**
 * The templates page shows two shelves — layouts and role blueprints — each
 * with its own category filter. Both grids are rendered server side; this only
 * decides what is on screen, so the page works as a plain list before it runs.
 */
import { fitSheet } from '../lib/fit';
import { paintResumeThumbs } from './draft-thumbs';

type TabKey = 'layouts' | 'roles';

const TABS: TabKey[] = ['layouts', 'roles'];

function isTab(value: string | null): value is TabKey {
  return value === 'layouts' || value === 'roles';
}

export function initGallery(): void {
  const root = document.querySelector<HTMLElement>('[data-gallery]');
  if (!root) return;

  const tabButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const emptyNote = root.querySelector<HTMLElement>('[data-empty]');
  const draftNote = root.querySelector<HTMLElement>('[data-draft-note]');

  // The layout cards preview whatever this visitor has already written, so
  // clicking one does not open a different person's resume. Blueprint cards
  // carry their own content and are left showing it.
  if (paintResumeThumbs(root) && draftNote) draftNote.hidden = false;

  // One filter per tab, remembered so switching back restores the choice.
  const filter: Record<TabKey, string> = { layouts: 'all', roles: 'all' };
  let tab: TabKey = 'layouts';

  function panelFor(key: TabKey): HTMLElement | null {
    return root!.querySelector<HTMLElement>(`[data-panel="${key}"]`);
  }

  /**
   * A sheet inside a hidden panel measures zero, so it has to be re-fitted the
   * moment it becomes visible or every thumbnail renders at the wrong scale.
   */
  function refit(panel: HTMLElement): void {
    panel.querySelectorAll<HTMLElement>('[data-sheet-fit]').forEach(fitSheet);
  }

  function applyFilter(): void {
    const panel = panelFor(tab);
    if (!panel) return;

    const active = filter[tab];
    let shown = 0;

    panel.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
      const match = active === 'all' || card.dataset.category === active;
      card.hidden = !match;
      if (match) shown += 1;
    });

    if (emptyNote) emptyNote.hidden = shown > 0;
    panel.hidden = shown === 0;
    if (shown > 0) refit(panel);
  }

  function syncFilterButtons(): void {
    TABS.forEach((key) => {
      const group = root!.querySelector<HTMLElement>(`[data-filters="${key}"]`);
      if (!group) return;
      group.hidden = key !== tab;
      group.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.filter === filter[key]));
      });
    });
  }

  function setTab(next: TabKey, pushState = true): void {
    tab = next;

    tabButtons.forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.tab === next));
    });

    TABS.forEach((key) => {
      const panel = panelFor(key);
      if (panel) panel.hidden = key !== next;
    });

    syncFilterButtons();
    applyFilter();

    if (pushState) {
      const url = new URL(location.href);
      if (next === 'layouts') url.searchParams.delete('tab');
      else url.searchParams.set('tab', next);
      history.replaceState(null, '', url);
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => setTab(button.dataset.tab as TabKey));
  });

  root.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest<HTMLElement>('[data-filters]');
      const key = group?.dataset.filters;
      if (!isTab(key ?? null)) return;
      filter[key as TabKey] = button.dataset.filter ?? 'all';
      syncFilterButtons();
      applyFilter();
    });
  });

  const requested = new URLSearchParams(location.search).get('tab');
  setTab(isTab(requested) ? requested : 'layouts', false);
}

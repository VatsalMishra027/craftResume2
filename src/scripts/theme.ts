/**
 * The colour theme, and the button that cycles it.
 *
 * The choice lives on <html data-theme>, which is also what the inline script
 * in the layout writes before first paint. Three states in a ring:
 * system → light → dark → system.
 */
import { loadTheme, saveTheme } from '../lib/store';
import type { Theme } from '../lib/store';

const ORDER: Theme[] = ['system', 'light', 'dark'];

const LABELS: Record<Theme, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

/** What the page is actually showing right now, system preference included. */
function effective(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function initThemeToggle(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-theme-toggle]'));
  if (!buttons.length) return;

  let theme = loadTheme();

  function sync(): void {
    apply(theme);
    buttons.forEach((button) => {
      button.dataset.state = theme;
      button.setAttribute(
        'title',
        `${LABELS[theme]} — click for ${LABELS[ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]].toLowerCase()}`,
      );
      const label = button.querySelector<HTMLElement>('[data-theme-label]');
      if (label) label.textContent = LABELS[theme];
    });
    // Anything that has to repaint when the palette flips — the editor's
    // preview chrome, for one — listens for this rather than polling.
    document.dispatchEvent(
      new CustomEvent('craftresume:theme', { detail: { theme, effective: effective(theme) } }),
    );
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      theme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
      saveTheme(theme);
      sync();
    });
  });

  // While the choice is "system", following the OS means listening to it.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme === 'system') sync();
  });

  // A second tab that changes the theme should not leave this one behind.
  window.addEventListener('storage', (event) => {
    if (event.key !== null && !event.key.endsWith('theme:v1')) return;
    theme = loadTheme();
    sync();
  });

  sync();
}

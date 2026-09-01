/**
 * The colour theme, and the button that switches it.
 *
 * Two states, not three. The choice lives on <html data-theme>, which is also
 * what the inline script in the layout writes before first paint, and it is
 * always one of `light` or `dark` — there is no "follow the system" mode to
 * fall back into. A browser that has never chosen takes its first value from
 * the OS and then records it, so the page never changes under someone
 * mid-session.
 */
import { loadTheme, saveTheme, storedTheme, systemTheme } from '../lib/store';
import type { Theme } from '../lib/store';

const LABELS: Record<Theme, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
};

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function initThemeToggle(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-theme-toggle]'));
  if (!buttons.length) return;

  let theme = loadTheme();
  // A first visit inherits the OS preference once, then owns it from there.
  if (!storedTheme()) saveTheme(theme);

  function sync(): void {
    apply(theme);
    buttons.forEach((button) => {
      button.dataset.state = theme;
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      button.setAttribute('title', `${LABELS[theme]} — click for ${LABELS[next].toLowerCase()}`);
      const label = button.querySelector<HTMLElement>('[data-theme-label]');
      if (label) label.textContent = LABELS[theme];
    });
    // Anything that has to repaint when the palette flips — the editor's
    // preview chrome, for one — listens for this rather than polling.
    document.dispatchEvent(new CustomEvent('craftresume:theme', { detail: { theme } }));
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      saveTheme(theme);
      sync();
    });
  });

  // A second tab that changes the theme should not leave this one behind.
  window.addEventListener('storage', (event) => {
    if (event.key !== null && !event.key.endsWith('theme:v1')) return;
    theme = storedTheme() ?? systemTheme();
    sync();
  });

  sync();
}

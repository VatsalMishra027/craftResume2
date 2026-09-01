/**
 * The typeface and text-size menu, wired the same way in both editors.
 *
 * The menu owns no state of its own: it reads the current values through the
 * getters it is handed and reports every change back, so whichever editor is
 * hosting it stays the single place that saves and repaints.
 */
import { FONTS, FONT_SIZES, resolveFont, resolveFontSize } from '../lib/fonts';

export interface TypeMenuOptions {
  font: () => string;
  size: () => string;
  onChange: (font: string, size: string) => void;
}

export function initTypeMenu(options: TypeMenuOptions): void {
  const fontButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-font]'));
  const sizeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-font-size]'));
  const label = document.querySelector<HTMLElement>('[data-font-label]');
  if (!fontButtons.length && !sizeButtons.length) return;

  function sync(): void {
    const font = resolveFont(options.font());
    const size = resolveFontSize(options.size());

    fontButtons.forEach((button) => {
      const active = button.dataset.font === font.id;
      button.setAttribute('aria-pressed', String(active));
      const tick = button.querySelector<HTMLElement>('[data-font-tick]');
      if (tick) {
        tick.classList.toggle('bg-ink', active);
        tick.classList.toggle('border-ink', active);
      }
    });

    sizeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.fontSize === size.id));
    });

    // The bar button says what is in force. "Type" on its own would be a menu
    // you have to open to find out what it did.
    if (label) {
      const name = font.id === 'default' ? 'Type' : font.name;
      label.textContent = size.id === 'm' ? name : `${name} · ${Math.round(size.scale * 100)}%`;
    }
  }

  fontButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const next = FONTS.find((entry) => entry.id === button.dataset.font);
      if (!next) return;
      options.onChange(next.id, options.size());
      sync();
    });
  });

  sizeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const next = FONT_SIZES.find((entry) => entry.id === button.dataset.fontSize);
      if (!next) return;
      options.onChange(options.font(), next.id);
      sync();
    });
  });

  sync();
}

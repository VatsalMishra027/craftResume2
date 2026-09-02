/**
 * The typeface menu and the text-size stepper, wired the same way in both
 * editors.
 *
 * Neither control owns any state: they read the current values through the
 * getters they are handed and report every change back, so whichever editor is
 * hosting them stays the single place that saves and repaints.
 */
import {
  DEFAULT_FONT_SIZE,
  FONTS,
  resolveFont,
  resolveFontSize,
  stepFontSize,
} from '../lib/fonts';

export interface TypeMenuOptions {
  font: () => string;
  size: () => string;
  onChange: (font: string, size: string) => void;
}

export function initTypeMenu(options: TypeMenuOptions): void {
  const fontButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-font]'));
  const stepButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-size-step]'));
  const resetButton = document.querySelector<HTMLButtonElement>('[data-size-reset]');
  const sizeValue = document.querySelector<HTMLElement>('[data-size-value]');
  const label = document.querySelector<HTMLElement>('[data-font-label]');
  if (!fontButtons.length && !stepButtons.length) return;

  function sync(): void {
    const font = resolveFont(options.font());
    const size = resolveFontSize(options.size());
    const percent = Math.round(size.scale * 100);

    fontButtons.forEach((button) => {
      const active = button.dataset.font === font.id;
      button.setAttribute('aria-pressed', String(active));
      const tick = button.querySelector<HTMLElement>('[data-font-tick]');
      if (tick) {
        tick.classList.toggle('bg-ink', active);
        tick.classList.toggle('border-ink', active);
      }
    });

    if (sizeValue) sizeValue.textContent = `${percent}%`;

    // A step that would not move the page is disabled rather than hidden, so
    // the three controls never shift position under the pointer.
    stepButtons.forEach((button) => {
      const delta = Number(button.dataset.sizeStep) || 0;
      button.disabled = stepFontSize(size.id, delta).id === size.id;
    });

    if (resetButton) {
      resetButton.title =
        size.id === DEFAULT_FONT_SIZE
          ? 'Text size'
          : `${size.name} — ${percent}%. Click to reset to 100%.`;
    }

    // The bar button says which face is in force. "Type" on its own would be a
    // menu you have to open to find out what it did.
    if (label) label.textContent = font.id === 'default' ? 'Type' : font.name;
  }

  fontButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const next = FONTS.find((entry) => entry.id === button.dataset.font);
      if (!next) return;
      options.onChange(next.id, options.size());
      sync();
    });
  });

  stepButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const delta = Number(button.dataset.sizeStep) || 0;
      const next = stepFontSize(options.size(), delta);
      if (next.id === resolveFontSize(options.size()).id) return;
      options.onChange(options.font(), next.id);
      sync();
    });
  });

  resetButton?.addEventListener('click', () => {
    if (resolveFontSize(options.size()).id === DEFAULT_FONT_SIZE) return;
    options.onChange(options.font(), DEFAULT_FONT_SIZE);
    sync();
  });

  sync();
}

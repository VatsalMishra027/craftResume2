/** 210mm expressed in CSS pixels at 96dpi — the true width of an A4 sheet. */
const SHEET_WIDTH_PX = 793.7008;

function apply(container: HTMLElement): void {
  const sheet = container.querySelector<HTMLElement>('.resume-sheet');
  if (!sheet) return;

  const available = container.clientWidth;
  if (!available) return;

  // Never scale past 1: an A4 page blown up larger than life reads as a bug.
  const scale = Math.min(available / SHEET_WIDTH_PX, 1);
  container.style.setProperty('--sheet-scale', String(scale));
  sheet.style.left = `${Math.max(0, (available - SHEET_WIDTH_PX * scale) / 2)}px`;

  // Scaled elements are out of flow, so a flowing preview needs an explicit
  // height or the surrounding page collapses around it.
  if (container.dataset.sheetFit === 'flow') {
    container.style.height = `${sheet.scrollHeight * scale}px`;
  }
}

/** Keeps every `[data-sheet-fit]` container matched to its sheet. */
export function observeSheets(root: ParentNode = document): () => void {
  const containers = Array.from(root.querySelectorAll<HTMLElement>('[data-sheet-fit]'));
  containers.forEach(apply);

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) apply(entry.target as HTMLElement);
  });
  containers.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}

export { apply as fitSheet };

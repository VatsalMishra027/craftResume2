/**
 * Cycles the hero's stack of resume sheets.
 *
 * The sheet waiting behind the front one lifts out of the stack, travels over
 * the top and settles face-up, and every sheet behind it slides forward one
 * place — so the whole stack moves, not just the two sheets swapping. Purely
 * presentational: every sheet is the real renderer's output, so nothing here
 * touches resume data.
 *
 * Depth is a number, not a named state, so the same rules hold for a stack of
 * four or a stack of ten. The CSS reads `--depth` and derives the offset, the
 * rotation, the shadow and the stacking order from it.
 */

/** Matches the .book-page transition; the incoming sheet is over the stack by now. */
const RISE_MS = 620;
/** The pause after the sheet lands, before the next one starts to lift. */
const HOLD_MS = 2900;
/** How long the sheets behind take to close the gap, so the stack settles as one. */
const SETTLE_STAGGER_MS = 45;

export function initBook(): void {
  const book = document.querySelector<HTMLElement>('[data-book]');
  if (!book) return;

  const pages = Array.from(book.querySelectorAll<HTMLElement>('[data-book-page]'));
  if (pages.length < 2) return;

  const caption = document.querySelector<HTMLElement>('[data-book-caption]');
  const counter = document.querySelector<HTMLElement>('[data-book-count]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let index = 0;
  let turning = false;
  let paused = false;
  let timer: number | undefined;
  const pending = new Set<number>();

  book.style.setProperty('--book-depth-count', String(pages.length - 1));

  function assign(): void {
    pages.forEach((page, i) => {
      const depth = (i - index + pages.length) % pages.length;
      page.style.setProperty('--depth', String(depth));
      // Each sheet behind waits a beat longer than the one in front of it, so
      // the stack closes up in a cascade rather than snapping shut together.
      page.style.transitionDelay = depth === 0 ? '0ms' : `${(depth - 1) * SETTLE_STAGGER_MS}ms`;
      page.dataset.state = depth === 0 ? 'front' : 'stack';
      page.setAttribute('aria-hidden', String(depth !== 0));
    });
    if (caption) caption.textContent = pages[index].dataset.name ?? '';
    if (counter) counter.textContent = `${index + 1} / ${pages.length}`;
  }

  function later(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      pending.delete(id);
      fn();
    }, ms);
    pending.add(id);
  }

  function advance(): void {
    index = (index + 1) % pages.length;
    assign();
    turning = false;
    schedule();
  }

  function turn(): void {
    if (turning) return;
    turning = true;

    if (reduced.matches) {
      advance();
      return;
    }

    // Lift the next sheet clear of the stack and above the front one. When it
    // is promoted to depth 0 a beat later it drops the rest of the way, which
    // reads as the page coming to rest on top of the one it replaced.
    const next = pages[(index + 1) % pages.length];
    next.style.transitionDelay = '0ms';
    next.dataset.state = 'rising';
    later(advance, RISE_MS);
  }

  function schedule(): void {
    window.clearTimeout(timer);
    if (paused || document.hidden) return;
    timer = window.setTimeout(turn, HOLD_MS);
  }

  function stop(): void {
    window.clearTimeout(timer);
  }

  // A hover is someone reading the page in front of them — let them.
  book.addEventListener('pointerenter', () => {
    paused = true;
    stop();
  });

  book.addEventListener('pointerleave', () => {
    paused = false;
    schedule();
  });

  book.addEventListener('click', () => {
    stop();
    turn();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else schedule();
  });

  window.addEventListener('pagehide', () => {
    stop();
    pending.forEach((id) => window.clearTimeout(id));
    pending.clear();
  });

  assign();
  schedule();
}

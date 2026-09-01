/**
 * Cycles the hero's stack of resume sheets. The sheet waiting behind the front
 * one lifts out of the stack, travels over the top and settles face-up, so the
 * templates change the way a hand deals one card onto another. Purely
 * presentational: every sheet is the real renderer's output, so nothing here
 * touches resume data.
 */

/** Matches the .book-page transition; the incoming sheet is over the stack by now. */
const RISE_MS = 700;
/** One sheet arriving to the next: the stack turns over every four seconds. */
const CYCLE_MS = 4000;
/** What is left of the cycle once the move itself is paid for. */
const HOLD_MS = CYCLE_MS - RISE_MS;

function stateFor(offset: number): string {
  if (offset === 0) return 'front';
  if (offset === 1) return 'stack';
  return 'deep';
}

export function initBook(): void {
  const book = document.querySelector<HTMLElement>('[data-book]');
  if (!book) return;

  const pages = Array.from(book.querySelectorAll<HTMLElement>('[data-book-page]'));
  if (pages.length < 2) return;

  const caption = document.querySelector<HTMLElement>('[data-book-caption]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let index = 0;
  let turning = false;
  let paused = false;
  let timer: number | undefined;
  const pending: number[] = [];

  function assign(): void {
    pages.forEach((page, i) => {
      page.dataset.state = stateFor((i - index + pages.length) % pages.length);
    });
    if (caption) caption.textContent = pages[index].dataset.name ?? '';
  }

  function later(fn: () => void, ms: number): void {
    pending.push(window.setTimeout(fn, ms));
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
    // is promoted to "front" a beat later it drops the rest of the way, which
    // reads as the page coming to rest on top of the one it replaced.
    pages[(index + 1) % pages.length].dataset.state = 'rising';
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
  });

  assign();
  schedule();
}

/**
 * A drum-roll year picker for the From / To fields.
 *
 * The inputs stay plain text — "2022", "Present" and "Sep 2022" all still type
 * fine — and the dial is a shortcut layered on top: a small button in the field
 * opens one shared popover with a scroll-snapping wheel of years. Turning the
 * wheel writes the year straight into the input and fires a bubbling `input`
 * event, so the editor's existing delegated handler repaints the sheet and
 * saves without knowing the dial exists.
 */

const MIN_YEAR = 1975;
const ITEM = 40;
const YEAR_RE = /\b(19|20)\d{2}\b/;
const DIAL_KEYS = new Set(['start', 'end']);

const ICON =
  '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="size-4"><circle cx="10" cy="10" r="7.25" stroke="currentColor" stroke-width="1.5"/><path d="M10 5.6V10l2.8 1.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The small dial button, placed inside a From / To field. */
export function yearDialButton(): string {
  return `<button type="button" data-year-dial aria-label="Pick a year" title="Pick a year" class="year-dial-btn">${ICON}</button>`;
}

export function usesYearDial(key: string): boolean {
  return DIAL_KEYS.has(key);
}

export function initYearDial(root: HTMLElement): void {
  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = MIN_YEAR; y <= thisYear + 6; y++) years.push(y);

  const pop = document.createElement('div');
  pop.className = 'year-dial';
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Pick a year');
  pop.innerHTML = `
    <div class="yd-head">
      <span class="yd-label" data-yd-label></span>
      <span class="yd-readout" data-yd-readout aria-live="polite"></span>
    </div>
    <div class="yd-wheel">
      <div class="yd-band" aria-hidden="true"></div>
      <ul class="yd-list" tabindex="0" role="listbox" aria-label="Years">
        ${years.map((y) => `<li role="option" data-year="${y}">${y}</li>`).join('')}
      </ul>
    </div>
    <div class="yd-foot">
      <button type="button" class="yd-chip" data-yd-present>Present</button>
      <button type="button" class="yd-chip" data-yd-clear>Clear</button>
      <button type="button" class="yd-chip yd-chip--primary" data-yd-done>Done</button>
    </div>`;
  document.body.appendChild(pop);

  const list = pop.querySelector<HTMLUListElement>('.yd-list')!;
  const items = Array.from(list.querySelectorAll<HTMLLIElement>('li'));
  const labelEl = pop.querySelector<HTMLElement>('[data-yd-label]')!;
  const readout = pop.querySelector<HTMLElement>('[data-yd-readout]')!;
  const presentBtn = pop.querySelector<HTMLButtonElement>('[data-yd-present]')!;

  let input: HTMLInputElement | null = null;
  let settleTimer: number | undefined;
  let silent = false;
  let raf = 0;

  const indexOf = (year: number) => Math.min(years.length - 1, Math.max(0, year - MIN_YEAR));
  const yearAt = () =>
    years[Math.min(years.length - 1, Math.max(0, Math.round(list.scrollTop / ITEM)))];

  /** Drum effect: rows tilt, shrink and fade away from the centre band. */
  function paint(): void {
    raf = 0;
    const centre = list.scrollTop / ITEM;
    items.forEach((li, i) => {
      const d = i - centre;
      const a = Math.abs(d);
      if (a > 3.2) {
        li.style.opacity = '0';
        li.style.transform = '';
        return;
      }
      li.style.opacity = String(Math.max(0.12, 1 - a * 0.34));
      li.style.transform = `rotateX(${(-d * 24).toFixed(1)}deg) scale(${(1 - a * 0.09).toFixed(3)})`;
      li.classList.toggle('is-centre', a < 0.5);
    });
  }

  function write(value: string): void {
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const isPresent = /^present$/i.test(value);
    readout.textContent = value || '—';
    presentBtn.classList.toggle('is-on', isPresent);
    pop.classList.toggle('is-present', isPresent);
  }

  function goTo(year: number, smooth = false): void {
    silent = true;
    list.scrollTo({ top: indexOf(year) * ITEM, behavior: smooth ? 'smooth' : 'auto' });
    window.setTimeout(() => (silent = false), smooth ? 320 : 40);
  }

  function open(target: HTMLInputElement): void {
    input = target;
    const isEnd = target.dataset.key === 'end';
    labelEl.textContent = isEnd ? 'To' : 'From';
    presentBtn.hidden = !isEnd;

    const current = target.value.trim();
    const match = current.match(YEAR_RE);
    pop.hidden = false;
    goTo(match ? Number(match[0]) : thisYear);
    paint();
    readout.textContent = current || String(thisYear);
    const isPresent = /^present$/i.test(current);
    presentBtn.classList.toggle('is-on', isPresent);
    pop.classList.toggle('is-present', isPresent);

    // Anchor under the field, or above it when the viewport runs out.
    const r = target.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    const below = r.bottom + 8 + h <= window.innerHeight;
    pop.style.left = `${left}px`;
    pop.style.top = `${below ? r.bottom + 8 : Math.max(8, r.top - h - 8)}px`;
    pop.dataset.side = below ? 'below' : 'above';
    list.focus({ preventScroll: true });
  }

  function close(): void {
    pop.hidden = true;
    input = null;
  }

  root.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-year-dial]');
    if (!btn) return;
    const field = btn.parentElement?.querySelector<HTMLInputElement>('input[data-key]');
    if (!field) return;
    event.preventDefault();
    if (!pop.hidden && input === field) close();
    else open(field);
  });

  list.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(paint);
    if (silent) return;
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => write(String(yearAt())), 90);
  });

  list.addEventListener('click', (event) => {
    const li = (event.target as HTMLElement).closest<HTMLLIElement>('li[data-year]');
    if (li) {
      write(li.dataset.year!);
      goTo(Number(li.dataset.year), true);
    }
  });

  // Mouse users get drag-to-spin; touch already scrolls natively.
  let drag: { y: number; top: number } | null = null;
  list.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') return;
    drag = { y: event.clientY, top: list.scrollTop };
    list.setPointerCapture(event.pointerId);
    list.classList.add('is-dragging');
  });
  list.addEventListener('pointermove', (event) => {
    if (drag) list.scrollTop = drag.top - (event.clientY - drag.y);
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    list.classList.remove('is-dragging');
    list.scrollTo({ top: Math.round(list.scrollTop / ITEM) * ITEM, behavior: 'smooth' });
  };
  list.addEventListener('pointerup', endDrag);
  list.addEventListener('pointercancel', endDrag);

  list.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      close();
    }
  });

  pop.addEventListener('click', (event) => {
    const t = event.target as HTMLElement;
    if (t.closest('[data-yd-present]')) write('Present');
    else if (t.closest('[data-yd-clear]')) write('');
    else if (t.closest('[data-yd-done]')) close();
  });

  document.addEventListener('pointerdown', (event) => {
    if (pop.hidden) return;
    const t = event.target as HTMLElement;
    if (pop.contains(t) || t.closest('[data-year-dial]')) return;
    close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !pop.hidden) close();
  });
  window.addEventListener('resize', close);
  document.addEventListener(
    'scroll',
    (event) => {
      if (!pop.hidden && !pop.contains(event.target as Node)) close();
    },
    true,
  );
}

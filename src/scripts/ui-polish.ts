/**
 * Visual polish only. Nothing in here reads or writes the resume, the stores
 * or the editor's own state: it watches the DOM the editor already produces
 * (rail counts, the save status, newly added cards) and decorates it, and it
 * stands down entirely for people who ask for reduced motion.
 */

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Gallery cards: gentle 3D tilt ----------------------------------------
   The lift, the shadow and the "Use this template" pill are CSS; this only
   feeds the pointer position to the card as two custom properties. */
const CARD_LINK = '[data-card] a[aria-label^="Use the"], [data-card] a[aria-label^="Start from"]';

export function initCardTilt(): void {
  if (!window.matchMedia('(hover: hover)').matches) return;

  document.addEventListener('pointermove', (event) => {
    if (reduceMotion()) return;
    const link = (event.target as HTMLElement).closest<HTMLElement>(CARD_LINK);
    if (!link) return;
    const r = link.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width - 0.5;
    const y = (event.clientY - r.top) / r.height - 0.5;
    link.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
    link.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
  });

  document.addEventListener(
    'pointerout',
    (event) => {
      const link = (event.target as HTMLElement).closest<HTMLElement>(CARD_LINK);
      if (!link || link.contains(event.relatedTarget as Node)) return;
      link.style.removeProperty('--rx');
      link.style.removeProperty('--ry');
    },
    true,
  );
}

/* --- Editor: section progress, save tick, new-card pop, download burst ----- */
export function initEditorPolish(): void {
  initSectionProgress();
  initSaveTick();
  initNewCardPop();
  initDownloadBurst();
}

function initSectionProgress(): void {
  const list = document.querySelector<HTMLElement>('.rail-list');
  const heading = document.querySelector<HTMLElement>('.rail-heading');
  if (!list || !heading) return;

  const C = 2 * Math.PI * 15.5;
  const box = document.createElement('div');
  box.className = 'rail-progress';
  box.innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="rp-track" cx="18" cy="18" r="15.5"/><circle class="rp-fill" cx="18" cy="18" r="15.5" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}"/></svg><span class="rp-text"></span>`;
  heading.after(box);
  const fill = box.querySelector<SVGCircleElement>('.rp-fill')!;
  const text = box.querySelector<HTMLElement>('.rp-text')!;

  let wasComplete = false;
  let first = true;
  let queued = false;

  function isFilled(row: HTMLElement): boolean {
    if (row.dataset.rail === 'basics') {
      const val = (name: string) =>
        document.querySelector<HTMLInputElement>(`[data-field="basics.${name}"]`)?.value.trim();
      return !!val('fullName') && !!(val('email') || val('phone'));
    }
    return !!row.querySelector('.rail-count')?.textContent?.trim();
  }

  function paint(): void {
    queued = false;
    const rows = Array.from(list!.querySelectorAll<HTMLElement>('.rail-row')).filter(
      (row) => row.dataset.hidden !== 'true',
    );
    let done = 0;
    rows.forEach((row) => {
      const filled = isFilled(row);
      if (filled) done++;
      let dot = row.querySelector<HTMLElement>('.rail-dot');
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'rail-dot';
        dot.setAttribute('aria-hidden', 'true');
        row.querySelector('.rail-item')?.insertBefore(dot, row.querySelector('.rail-count'));
      }
      dot.dataset.filled = String(filled);
    });

    const total = rows.length || 1;
    fill.style.strokeDashoffset = String(C * (1 - done / total));
    text.textContent = `${done} of ${rows.length} sections filled`;
    box.setAttribute('aria-label', text.textContent);

    const complete = rows.length > 0 && done === rows.length;
    box.classList.toggle('is-complete', complete);
    if (complete && !wasComplete && !first && !reduceMotion()) {
      box.classList.remove('is-celebrating');
      void box.offsetWidth;
      box.classList.add('is-celebrating');
    }
    wasComplete = complete;
    first = false;
  }

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };

  new MutationObserver(schedule).observe(list, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-hidden'],
  });
  document.addEventListener('input', (event) => {
    if ((event.target as HTMLElement).closest?.('[data-field^="basics."]')) schedule();
  });
  paint();
}

function initSaveTick(): void {
  const status = document.querySelector<HTMLElement>('[data-save-status]');
  if (!status) return;
  const sync = () => {
    const t = (status.textContent ?? '').trim();
    status.dataset.state = t.startsWith('Saving') ? 'saving' : t.startsWith('Saved') ? 'saved' : '';
  };
  new MutationObserver(sync).observe(status, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  sync();
}

function initNewCardPop(): void {
  const counts = new WeakMap<Element, number>();
  const watch = (host: Element) => {
    counts.set(host, host.querySelectorAll('[data-item]').length);
    new MutationObserver(() => {
      const items = host.querySelectorAll<HTMLElement>('[data-item]');
      const before = counts.get(host) ?? items.length;
      counts.set(host, items.length);
      // Exactly one more than before is "add a role"; a full re-render at the
      // same size, or a delete, should not animate anything.
      if (items.length === before + 1 && !reduceMotion()) {
        const added = items[items.length - 1];
        added.classList.add('is-new');
        added.addEventListener('animationend', () => added.classList.remove('is-new'), {
          once: true,
        });
      }
    }).observe(host, { childList: true });
  };
  document.querySelectorAll('[data-list]').forEach(watch);
}

function initDownloadBurst(): void {
  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-download]');
    const kind = button?.dataset.download;
    if (!button || kind === 'docx' || kind === 'copy' || reduceMotion()) return;
    const anchor =
      document.querySelector<HTMLElement>('[data-menu="download"] [data-menu-button]') ?? button;
    burst(anchor.getBoundingClientRect());
  });
}

const BURST_COLOURS = ['#b8501f', '#e8855a', '#f0b45e', '#16150f', '#faf9f6'];

function burst(from: DOMRect): void {
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  for (let i = 0; i < 16; i++) {
    const piece = document.createElement('i');
    piece.className = 'burst-piece';
    piece.style.cssText = `left:${cx}px;top:${cy}px;background:${BURST_COLOURS[i % BURST_COLOURS.length]}`;
    document.body.appendChild(piece);
    const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
    const dist = 50 + Math.random() * 60;
    piece
      .animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0deg) scale(1)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist + 24}px)) rotate(${200 + Math.random() * 300}deg) scale(.6)`,
            opacity: 0,
          },
        ],
        { duration: 800 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)' },
      )
      .finished.then(() => piece.remove())
      .catch(() => piece.remove());
  }
}

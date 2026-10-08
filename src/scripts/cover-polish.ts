/**
 * Cover letter editor extras: a length meter, a guided three-block way to
 * write the letter, and a hover preview for the letter formats.
 *
 * None of it owns any data. The meter only reads the letter textarea; the
 * guided blocks are a second view over that same textarea — they write the
 * joined text into it and fire the `input` event, so the editor's existing
 * handler saves and repaints exactly as if the text had been typed there; and
 * the hover preview paints a format onto the sheet and puts it back unless the
 * format is actually chosen.
 */
import { letterClass, renderCoverLetter } from '../lib/render';
import { loadResume } from '../lib/store';

const MODE_KEY = 'craftresume:letter-mode:v1';

const BLOCKS = [
  {
    title: 'Why this role',
    tip: 'Name the role and the one thing about the work that pulls you in.',
    placeholder: 'I am applying for the … role because …',
  },
  {
    title: 'What you have done',
    tip: 'Your strongest proof, with a number. Two or three concrete results.',
    placeholder: 'At … I rebuilt …, which lifted … from … to … in …',
  },
  {
    title: 'What happens next',
    tip: 'Close with a clear ask and a thank you.',
    placeholder: 'I would welcome the chance to talk about … Thank you for your time.',
  },
];

function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function initCoverPolish(): void {
  const body = document.querySelector<HTMLTextAreaElement>('[data-field="cover.body"]');
  const bodyLabel = body?.closest('label');
  if (body && bodyLabel) {
    initMeter(body, bodyLabel);
    initGuided(body, bodyLabel);
  }
  initFormatHover();
}

/* --- Length meter -------------------------------------------------------- */
function initMeter(body: HTMLTextAreaElement, anchor: HTMLElement): void {
  const MAX = 450;
  const LOW = 180;
  const HIGH = 350;

  const meter = document.createElement('div');
  meter.className = 'cl-meter';
  meter.innerHTML = `
    <div class="cl-meter-top">
      <span class="cl-meter-words"></span>
      <span class="cl-meter-status"></span>
    </div>
    <div class="cl-meter-track" aria-hidden="true">
      <span class="cl-meter-zone" style="left:${(LOW / MAX) * 100}%;width:${((HIGH - LOW) / MAX) * 100}%"></span>
      <span class="cl-meter-fill"></span>
    </div>`;
  anchor.after(meter);
  const words = meter.querySelector<HTMLElement>('.cl-meter-words')!;
  const status = meter.querySelector<HTMLElement>('.cl-meter-status')!;
  const fill = meter.querySelector<HTMLElement>('.cl-meter-fill')!;

  function update(): void {
    const n = countWords(body.value);
    const paras = paragraphs(body.value).length;
    words.textContent = `${n} ${n === 1 ? 'word' : 'words'} · ${paras} ${paras === 1 ? 'paragraph' : 'paragraphs'}`;
    fill.style.width = `${Math.min(n / MAX, 1) * 100}%`;

    let state: string;
    let text: string;
    if (n === 0) [state, text] = ['empty', 'Start writing'];
    else if (n < 120) [state, text] = ['short', 'A little short — aim for 180–350'];
    else if (n < LOW) [state, text] = ['near', 'Getting there'];
    else if (n <= HIGH) [state, text] = ['good', 'Good length — people read this far'];
    else if (n <= MAX) [state, text] = ['long', 'Running long — trim a little'];
    else [state, text] = ['over', 'Too long for one page'];
    meter.dataset.state = state;
    status.textContent = text;
  }

  document.addEventListener('input', (event) => {
    if (event.target === body) update();
  });
  // Re-check when the text is replaced without typing (Start over, a format
  // change that reloads it) — cheap, and keeps the meter honest.
  document.addEventListener('click', () => window.setTimeout(update, 0));
  update();
}

/* --- Guided three-block writing ------------------------------------------ */
function initGuided(body: HTMLTextAreaElement, bodyLabel: HTMLElement): void {
  let mode: 'guided' | 'free' = 'guided';
  try {
    if (localStorage.getItem(MODE_KEY) === 'free') mode = 'free';
  } catch {
    /* Private mode: guided it is. */
  }

  const wrap = document.createElement('div');
  wrap.className = 'cl-writer';
  wrap.innerHTML = `
    <div class="cl-mode" role="group" aria-label="How to write the letter">
      <button type="button" data-cl-mode="guided">Guided</button>
      <button type="button" data-cl-mode="free">Free write</button>
    </div>
    <div class="cl-guided">
      ${BLOCKS.map(
        (b, i) => `
        <label class="cl-block">
          <span class="cl-block-head">
            <span class="cl-step">${i + 1}</span>
            <span class="cl-block-title">${b.title}</span>
            <span class="cl-block-count" data-cl-count></span>
          </span>
          <span class="cl-block-tip">${b.tip}</span>
          <textarea rows="${i === 1 ? 6 : 4}" placeholder="${b.placeholder}" data-cl-block="${i}"></textarea>
        </label>`,
      ).join('')}
    </div>`;
  bodyLabel.before(wrap);

  const blocks = Array.from(wrap.querySelectorAll<HTMLTextAreaElement>('[data-cl-block]'));
  const counts = Array.from(wrap.querySelectorAll<HTMLElement>('[data-cl-count]'));
  const modeButtons = Array.from(wrap.querySelectorAll<HTMLButtonElement>('[data-cl-mode]'));
  const guided = wrap.querySelector<HTMLElement>('.cl-guided')!;

  function paintCounts(): void {
    blocks.forEach((block, i) => {
      const n = countWords(block.value);
      counts[i].textContent = n ? `${n} words` : '';
    });
  }

  /** Splits the letter into the three blocks; extra paragraphs ride in the last. */
  function fromBody(): void {
    const paras = paragraphs(body.value);
    blocks[0].value = paras[0] ?? '';
    blocks[1].value = paras[1] ?? '';
    blocks[2].value = paras.slice(2).join('\n\n');
    paintCounts();
  }

  function apply(next: 'guided' | 'free'): void {
    mode = next;
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* Not persisted; still works this visit. */
    }
    if (mode === 'guided') fromBody();
    guided.hidden = mode !== 'guided';
    bodyLabel.hidden = mode === 'guided';
    modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.clMode === mode)));
  }

  blocks.forEach((block) => {
    block.addEventListener('input', () => {
      body.value = blocks
        .map((b) => b.value.trim())
        .filter(Boolean)
        .join('\n\n');
      paintCounts();
      // The editor's own handler saves and repaints off this event.
      body.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  modeButtons.forEach((b) =>
    b.addEventListener('click', () => apply(b.dataset.clMode === 'free' ? 'free' : 'guided')),
  );

  // "Start over" (and anything else that rewrites the letter) bypasses typing.
  document.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-letter-reset]')) {
      window.setTimeout(() => {
        if (mode === 'guided') fromBody();
      }, 0);
    }
  });

  // The editor fills the textarea as it boots, after this runs.
  window.setTimeout(() => apply(mode), 0);
}

/* --- Hover preview for the letter formats -------------------------------- */
function initFormatHover(): void {
  const preview = document.querySelector<HTMLElement>('[data-preview]');
  if (!preview) return;

  let saved: { cls: string; html: string } | null = null;

  function show(id: string | undefined): void {
    if (!id) return;
    try {
      if (!saved) saved = { cls: preview!.className, html: preview!.innerHTML };
      preview!.className = `${letterClass(id)} resume-sheet--live`;
      preview!.innerHTML = renderCoverLetter(loadResume(), id);
    } catch {
      restore();
    }
  }

  function restore(): void {
    if (!saved) return;
    preview!.className = saved.cls;
    preview!.innerHTML = saved.html;
    saved = null;
  }

  document.querySelectorAll<HTMLElement>('[data-menu="letter"] [data-letter]').forEach((btn) => {
    btn.addEventListener('pointerenter', () => show(btn.dataset.letter));
    btn.addEventListener('focus', () => show(btn.dataset.letter));
    btn.addEventListener('pointerleave', restore);
    btn.addEventListener('blur', restore);
    // Choosing it repaints the sheet itself; the saved copy must not undo that.
    btn.addEventListener(
      'click',
      () => {
        saved = null;
      },
      true,
    );
  });

  // Closing the menu any other way must not leave a preview on the page.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') restore();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!(event.target as HTMLElement).closest('[data-menu="letter"]')) restore();
  });
}

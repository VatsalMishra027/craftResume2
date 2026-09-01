import type {
  CertificationItem,
  EducationItem,
  ExperienceItem,
  InterestItem,
  LanguageItem,
  ProjectItem,
  PublicationItem,
  ResumeData,
  SectionKey,
  SectionMeta,
  SkillItem,
} from './types';
import { SECTION_KEYS } from './types';
import { EMPTY_COVER_LETTER } from './sample';
import { resolveAccent, resolveTemplate } from './templates';
import { resolveFont, resolveFontSize } from './fonts';

/** All user content passes through here before it touches innerHTML. */
function esc(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clean(value: string): string {
  return (value ?? '').trim();
}

function lines(value: string): string[] {
  return clean(value)
    .split('\n')
    .map((line) => line.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean);
}

function list(value: string): string[] {
  return clean(value)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/* ---------------------------------------------------------------------------
   Click-to-edit hooks.

   Every rendered fragment carries the address of the field that produced it,
   so a click on the page can open the matching control in the form. `hook`
   points at one input; `opens` points at a whole section.
--------------------------------------------------------------------------- */
function hook(path: string): string {
  return ` data-e="${esc(path)}"`;
}

function opens(panel: string): string {
  return ` data-e-open="${esc(panel)}"`;
}

/** Renders "2022 — Present", collapsing gracefully when only one side exists. */
function dateRange(section: string, id: string, start: string, end: string): string {
  const a = clean(start);
  const b = clean(end);
  if (!a && !b) return '';
  const body = a && b ? `${esc(a)} — ${esc(b)}` : esc(a || b);
  const target = a ? 'start' : 'end';
  return `<span class="rs-entry-meta"${hook(`${section}|${id}|${target}`)}>${body}</span>`;
}

/* ---------------------------------------------------------------------------
   Renamed and removed headings.

   The user can retitle a section or take it off the sheet entirely, and the
   choice has to reach twelve template functions that all call `section()`.
   Rather than thread an argument through every one of them, the map is set
   once per render — `renderResume` is synchronous, so it is only ever the
   sheet currently being built.
--------------------------------------------------------------------------- */
let headings: Partial<Record<string, SectionMeta>> = {};

/**
 * The order the user has arranged the sections into, empty when they have left
 * it alone. Set per render alongside `headings`, and for the same reason.
 */
let sectionOrder: string[] = [];

/** The panel a rendered section came from, read back off its own open hook. */
function panelOf(html: string): string | null {
  const match = /data-e-open="([^"]+)"/.exec(html);
  return match ? match[1] : null;
}

/**
 * Joins one column of a template, putting its sections in the user's order.
 *
 * Nothing moves between columns: a section the template put in the rail stays
 * in the rail and only changes places with the other rail sections, because a
 * skills meter built for a 60mm column has no business in the main body.
 * Anything that is not a reorderable section — a header, the summary — keeps
 * the slot the template gave it, and the movable sections fill the rest.
 */
function compose(parts: string[]): string {
  const kept = parts.filter(Boolean);
  if (!sectionOrder.length) return kept.join('');

  const slots: number[] = [];
  const movable: string[] = [];
  kept.forEach((html, index) => {
    const panel = panelOf(html);
    if (panel && sectionOrder.includes(panel)) {
      slots.push(index);
      movable.push(html);
    }
  });
  if (movable.length < 2) return kept.join('');

  movable.sort((a, b) => sectionOrder.indexOf(panelOf(a)!) - sectionOrder.indexOf(panelOf(b)!));

  const out = kept.slice();
  slots.forEach((slot, i) => {
    out[slot] = movable[i];
  });
  return out.join('');
}

/** The title to print, or null when the user has removed the section. */
function heading(title: string, panel: string): string | null {
  const meta = headings[panel];
  if (meta?.hidden) return null;
  return clean(meta?.label ?? '') || title;
}

function section(title: string, body: string, panel: string, extraClass = ''): string {
  const label = heading(title, panel);
  if (!label || !body) return '';
  return `<section class="rs-section ${extraClass}"${opens(panel)}><h2 class="rs-section-title">${esc(label)}</h2><div class="rs-section-body">${body}</div></section>`;
}

/* --- Contact + icons ------------------------------------------------------ */

const CONTACT_FIELDS = [
  { key: 'email', icon: 'mail' },
  { key: 'phone', icon: 'phone' },
  { key: 'location', icon: 'pin' },
  { key: 'website', icon: 'globe' },
  { key: 'linkedin', icon: 'linkedin' },
  { key: 'github', icon: 'github' },
] as const;

const ICONS: Record<string, string> = {
  mail: '<rect x="2" y="4" width="12" height="8" rx="1"/><path d="m2.5 4.8 5.5 4 5.5-4"/>',
  phone:
    '<path d="M5.4 2.6 6.9 5 5.7 6.4c.7 1.5 1.9 2.7 3.4 3.4L10.5 8.6l2.4 1.5-.4 2c-.1.5-.6.9-1.1.8C7 12.3 3.2 8.5 2.5 4.1c-.1-.5.3-1 .8-1.1z"/>',
  pin: '<path d="M8 14.2s4.6-4.2 4.6-7.6A4.6 4.6 0 0 0 3.4 6.6C3.4 10 8 14.2 8 14.2z"/><circle cx="8" cy="6.6" r="1.7"/>',
  globe: '<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c1.8 2 1.8 10 0 12M8 2C6.2 4 6.2 12 8 14"/>',
  linkedin:
    '<rect x="2.4" y="2.4" width="11.2" height="11.2" rx="1.2"/><path d="M5.2 6.9v4.2M5.2 5.05v.1M7.7 11.1V6.9M7.7 8.6c0-1.7 2.9-1.7 2.9 0v2.5"/>',
  github:
    '<path d="M9.9 13.8v-2c0-.7-.2-1.2-.6-1.5 2-.2 3.8-1 3.8-4a3.1 3.1 0 0 0-.8-2.1c.1-.2.4-1-.1-2.1 0 0-.7-.2-2.2.8a7.4 7.4 0 0 0-3.9 0C4.6 1.9 3.9 2.1 3.9 2.1c-.5 1.1-.2 1.9-.1 2.1a3.1 3.1 0 0 0-.8 2.1c0 3 1.8 3.8 3.7 4-.2.2-.4.6-.5 1.1-.4.2-1.6.6-2.3-.7 0 0-.4-.8-1.2-.8"/>',
  award: '<circle cx="8" cy="6.2" r="3.8"/><path d="M5.6 9.5 4.6 14 8 12.4 11.4 14l-1-4.5"/>',
  book: '<path d="M2.6 3h4a2 2 0 0 1 2 2v8a1.6 1.6 0 0 0-1.6-1.6H2.6z"/><path d="M13.4 3h-4a2 2 0 0 0-2 2v8a1.6 1.6 0 0 1 1.6-1.6h4.4z"/>',
  star: '<path d="m8 1.9 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.7 4.2 13.7l.7-4.3-3.1-3 4.3-.6z"/>',
  heart:
    '<path d="M8 13.6S2.2 10.3 2.2 6.4a2.9 2.9 0 0 1 5.8-.9 2.9 2.9 0 0 1 5.8.9c0 3.9-5.8 7.2-5.8 7.2z"/>',
  case: '<rect x="2.2" y="5.4" width="11.6" height="8.2" rx="1"/><path d="M6 5.4V3.6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.8"/>',
  cap: '<path d="m8 2.6 6 2.8-6 2.8-6-2.8z"/><path d="M4.4 6.6v3.6c0 1 1.6 1.8 3.6 1.8s3.6-.8 3.6-1.8V6.6"/>',
  spark: '<path d="M8 2.2 9.3 6l3.8 1.3L9.3 8.6 8 12.4 6.7 8.6 2.9 7.3 6.7 6z"/>',
};

function icon(name: string, cls = 'rs-icon'): string {
  const body = ICONS[name] ?? ICONS.spark;
  return `<svg class="${cls}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** A value only becomes a real link once it is safely http(s), mail or tel. */
function href(value: string): string | null {
  const raw = clean(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(mailto:|tel:)/i.test(raw)) return raw;
  if (/^[\w.@-]+\.[a-z]{2,}(\/|$)/i.test(raw)) return `https://${raw}`;
  return null;
}

function linkOrText(value: string, cls = 'rs-link'): string {
  const text = clean(value);
  if (!text) return '';
  const url = href(text);
  return url
    ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`
    : esc(text);
}

function contactItems(data: ResumeData, withIcons: boolean): string[] {
  return CONTACT_FIELDS.filter((field) => clean(data.basics[field.key])).map((field) => {
    const value = clean(data.basics[field.key]);
    return `<li${hook(`basics|${field.key}`)}>${withIcons ? icon(field.icon) : ''}<span>${esc(value)}</span></li>`;
  });
}

function contactList(data: ResumeData, withIcons = false): string {
  const items = contactItems(data, withIcons);
  if (!items.length) return '';
  return `<ul class="rs-contact">${items.join('')}</ul>`;
}

function nameBlock(data: ResumeData): string {
  const name = clean(data.basics.fullName);
  const title = clean(data.basics.title);
  const nameHtml = name
    ? `<h1 class="rs-name"${hook('basics|fullName')}>${esc(name)}</h1>`
    : `<h1 class="rs-name rs-placeholder"${hook('basics|fullName')}>Your name</h1>`;
  const titleHtml = title ? `<p class="rs-role"${hook('basics|title')}>${esc(title)}</p>` : '';
  return nameHtml + titleHtml;
}

function summaryBlock(summary: string): string {
  const text = clean(summary);
  return text ? `<p class="rs-summary"${hook('basics|summary')}>${esc(text)}</p>` : '';
}

/* --- Repeating blocks ----------------------------------------------------- */

function experienceBlock(items: ExperienceItem[]): string {
  return items
    .filter((item) => clean(item.role) || clean(item.company) || clean(item.bullets))
    .map((item) => {
      const bullets = lines(item.bullets);
      const company = clean(item.company);
      const location = clean(item.location);
      const sub =
        company || location
          ? `<div class="rs-entry-sub">${
              company
                ? `<p class="rs-entry-org"${hook(`experience|${item.id}|company`)}>${esc(company)}</p>`
                : ''
            }${
              location
                ? `<p class="rs-entry-where"${hook(`experience|${item.id}|location`)}>${esc(location)}</p>`
                : ''
            }</div>`
          : '';
      const list = bullets.length
        ? `<ul class="rs-bullets"${hook(`experience|${item.id}|bullets`)}>${bullets
            .map((b) => `<li>${esc(b)}</li>`)
            .join('')}</ul>`
        : '';
      return `<article class="rs-entry"><div class="rs-entry-head"><h3 class="rs-entry-title"${hook(`experience|${item.id}|role`)}>${esc(clean(item.role))}</h3>${dateRange('experience', item.id, item.start, item.end)}</div>${sub}${list}</article>`;
    })
    .join('');
}

/**
 * `degreeFirst` decides which line carries the weight. Working resumes lead
 * with the qualification; an academic CV leads with the institution.
 */
function educationBlock(items: EducationItem[], degreeFirst: boolean): string {
  return items
    .filter((item) => clean(item.degree) || clean(item.school))
    .map((item) => {
      const leadKey = degreeFirst ? 'degree' : 'school';
      const trailKey = degreeFirst ? 'school' : 'degree';
      const lead = clean(degreeFirst ? item.degree : item.school);
      const trail = clean(degreeFirst ? item.school : item.degree);
      const location = clean(item.location);
      const note = clean(item.note);
      const trailHtml = trail
        ? `<p class="rs-entry-org"${hook(`education|${item.id}|${trailKey}`)}>${esc(trail)}${
            location
              ? ` <span class="rs-entry-inline"${hook(`education|${item.id}|location`)}>· ${esc(location)}</span>`
              : ''
          }</p>`
        : '';
      const noteHtml = note
        ? `<p class="rs-entry-note"${hook(`education|${item.id}|note`)}>${esc(note)}</p>`
        : '';
      return `<article class="rs-entry"><div class="rs-entry-head"><h3 class="rs-entry-title"${hook(`education|${item.id}|${leadKey}`)}>${esc(lead)}</h3>${dateRange('education', item.id, item.start, item.end)}</div>${trailHtml}${noteHtml}</article>`;
    })
    .join('');
}

function projectsBlock(items: ProjectItem[], withChips: boolean, allowLinks: boolean): string {
  return items
    .filter((item) => clean(item.name) || clean(item.description))
    .map((item) => {
      const link = clean(item.link);
      const tech = list(item.tech);
      const linkHtml = link
        ? `<span class="rs-entry-meta rs-project-link"${allowLinks ? '' : hook(`projects|${item.id}|link`)}>${
            allowLinks ? linkOrText(link) : esc(link)
          }</span>`
        : '';
      const desc = clean(item.description)
        ? `<p class="rs-entry-note"${hook(`projects|${item.id}|description`)}>${esc(clean(item.description))}</p>`
        : '';
      let techHtml = '';
      if (tech.length) {
        techHtml = withChips
          ? `<ul class="rs-chips"${hook(`projects|${item.id}|tech`)}>${tech
              .map((t) => `<li>${esc(t)}</li>`)
              .join('')}</ul>`
          : `<p class="rs-tech"${hook(`projects|${item.id}|tech`)}>Technologies: ${esc(tech.join(', '))}</p>`;
      }
      return `<article class="rs-entry rs-project"><div class="rs-entry-head"><h3 class="rs-entry-title"${hook(`projects|${item.id}|name`)}>${esc(clean(item.name))}</h3>${linkHtml}</div>${desc}${techHtml}</article>`;
    })
    .join('');
}

function skillMeters(items: SkillItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<ul class="rs-meters">${usable
    .map(
      (item) =>
        `<li${hook(`skills|${item.id}|name`)}><span class="rs-meter-head"><span class="rs-meter-name">${esc(clean(item.name))}</span><span class="rs-meter-value">${item.level}/5</span></span><span class="rs-meter"><i style="width:${item.level * 20}%"></i></span></li>`,
    )
    .join('')}</ul>`;
}

const LEVEL_WORDS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];

function skillDotRows(items: SkillItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<ul class="rs-dotrows">${usable
    .map(
      (item) =>
        `<li${hook(`skills|${item.id}|name`)}><span class="rs-dotrow-name">${esc(clean(item.name))}</span><span class="rs-dotrow-level">${esc(LEVEL_WORDS[item.level - 1] ?? '')}</span></li>`,
    )
    .join('')}</ul>`;
}

function skillInline(items: SkillItem[], withLevels: boolean): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<ul class="rs-inline">${usable
    .map(
      (item) =>
        `<li${hook(`skills|${item.id}|name`)}><strong>${esc(clean(item.name))}</strong>${withLevels ? ` (${item.level}/5)` : ''}</li>`,
    )
    .join('')}</ul>`;
}

/** A plain multi-column list. No meters, no dots — a parser reads it as words. */
function skillGrid(items: SkillItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<ul class="rs-grid">${usable
    .map((item) => `<li${hook(`skills|${item.id}|name`)}>${esc(clean(item.name))}</li>`)
    .join('')}</ul>`;
}

/** One run-in sentence of skills — the least a strict parser can trip over. */
function skillPlain(items: SkillItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<p class="rs-runin">${usable
    .map((item) => `<span${hook(`skills|${item.id}|name`)}>${esc(clean(item.name))}</span>`)
    .join(', ')}</p>`;
}

/** Skills as tinted chips, for the layouts that already use a chip vocabulary. */
function skillChips(items: SkillItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<ul class="rs-chips rs-chips--skills">${usable
    .map((item) => `<li${hook(`skills|${item.id}|name`)}>${esc(clean(item.name))}</li>`)
    .join('')}</ul>`;
}

function languageRows(items: LanguageItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<ul class="rs-pairs">${usable
    .map(
      (item) =>
        `<li><span${hook(`languages|${item.id}|name`)}>${esc(clean(item.name))}</span><span class="rs-pair-value"${hook(`languages|${item.id}|level`)}>${esc(clean(item.level))}</span></li>`,
    )
    .join('')}</ul>`;
}

function languageInline(items: LanguageItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<p class="rs-runin">${usable
    .map(
      (item) =>
        `<span${hook(`languages|${item.id}|name`)}>${esc(clean(item.name))}</span>${
          clean(item.level)
            ? ` <span${hook(`languages|${item.id}|level`)}>(${esc(clean(item.level))})</span>`
            : ''
        }`,
    )
    .join(', ')}</p>`;
}

function certificationBlock(items: CertificationItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return usable
    .map((item) => {
      const issuer = clean(item.issuer);
      const date = clean(item.date);
      const meta =
        issuer || date
          ? `<p class="rs-mini-meta">${
              issuer
                ? `<span${hook(`certifications|${item.id}|issuer`)}>${esc(issuer)}</span>`
                : ''
            }${date ? ` <span${hook(`certifications|${item.id}|date`)}>(${esc(date)})</span>` : ''}</p>`
          : '';
      return `<article class="rs-mini"><p class="rs-mini-title"${hook(`certifications|${item.id}|name`)}>${esc(clean(item.name))}</p>${meta}</article>`;
    })
    .join('');
}

function certificationLines(items: CertificationItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<ul class="rs-plainlist">${usable
    .map((item) => {
      const issuer = clean(item.issuer);
      const date = clean(item.date);
      return `<li><strong${hook(`certifications|${item.id}|name`)}>${esc(clean(item.name))}</strong>${
        issuer ? ` — <span${hook(`certifications|${item.id}|issuer`)}>${esc(issuer)}</span>` : ''
      }${date ? ` <span${hook(`certifications|${item.id}|date`)}>(${esc(date)})</span>` : ''}</li>`;
    })
    .join('')}</ul>`;
}

function publicationBlock(items: PublicationItem[], numbered: boolean): string {
  const usable = items.filter((item) => clean(item.title));
  if (!usable.length) return '';
  const tag = numbered ? 'ol' : 'ul';
  const body = usable
    .map(
      (item) =>
        `<li><span${hook(`publications|${item.id}|title`)}>${esc(clean(item.title))}</span>${
          clean(item.meta)
            ? `<span class="rs-pub-meta"${hook(`publications|${item.id}|meta`)}> — ${esc(clean(item.meta))}</span>`
            : ''
        }</li>`,
    )
    .join('');
  return `<${tag} class="rs-pubs${numbered ? ' rs-pubs--numbered' : ''}">${body}</${tag}>`;
}

function interestBadges(items: InterestItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<ul class="rs-interests">${usable
    .map(
      (item) =>
        `<li${hook(`interests|${item.id}|name`)}>${icon('spark', 'rs-icon rs-icon--disc')}<span>${esc(clean(item.name))}</span></li>`,
    )
    .join('')}</ul>`;
}

function interestInline(items: InterestItem[]): string {
  const usable = items.filter((item) => clean(item.name));
  if (!usable.length) return '';
  return `<ul class="rs-inline">${usable
    .map((item) => `<li${hook(`interests|${item.id}|name`)}>${esc(clean(item.name))}</li>`)
    .join('')}</ul>`;
}

/* --- Headshot ------------------------------------------------------------- */

/**
 * Only a data: URL is ever drawn. The picture is read off the user's own disk
 * and kept in their browser, so there is no remote source to honour — and
 * refusing everything else means a crafted draft cannot turn the sheet into a
 * beacon that calls out to a third party when it is opened.
 */
function photoSrc(data: ResumeData): string {
  const raw = clean(data.basics.photo ?? '');
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(raw) ? raw : '';
}

/**
 * The stand-in portrait.
 *
 * A photo layout with an empty frame is not the layout — the header re-flows,
 * the column widths change, and the sheet in the editor stops being the sheet
 * that was picked in the gallery. So every photo template always draws a
 * portrait: the user's own once there is one, and this generated one until
 * then. It is deliberately an illustration rather than a stock photograph of
 * a real person — nobody's face ends up on someone else's resume — and it is
 * tinted from the sheet's own accent, so it belongs to whichever template is
 * drawing it.
 */
const PHOTO_PLACEHOLDER = [
  // No <defs>, no gradients, no clip paths — nothing here carries an `id`.
  // The templates gallery paints seventeen sheets onto one document, and a
  // duplicated SVG id means every avatar on the page silently resolves to the
  // first sheet's colours. Flat shapes tinted through CSS have no such
  // problem, and the frame's own overflow does the clipping.
  '<svg class="rs-photo-avatar" viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">',
  '<rect class="rs-av-bg" width="120" height="120"/>',
  '<circle class="rs-av-glow" cx="60" cy="46" r="42"/>',
  // Shoulders and collar — the bust that makes it read as a headshot crop.
  '<path class="rs-av-body" d="M18 120c0-19.2 11.6-30.4 25.4-34.6h33.2C90.4 89.6 102 100.8 102 120z"/>',
  '<path class="rs-av-shirt" d="M52.8 85.4h14.4l-2 9.2-5.2 5.6-5.2-5.6z"/>',
  // Neck, then the head over it.
  '<path class="rs-av-skin" d="M52.4 72h15.2v16.6c0 3.4-3.4 5.8-7.6 5.8s-7.6-2.4-7.6-5.8z"/>',
  '<ellipse class="rs-av-skin" cx="60" cy="52" rx="19.4" ry="22.4"/>',
  // Hair: a crown and two short sides, which is as much detail as 29mm holds.
  '<path class="rs-av-hair" d="M60 25.6c12.4 0 20.6 8 20.6 19.4 0 4.6-.9 8-2.2 10.6l-2.5-12.3c-9.4 1.6-22.9 1-31.6-4.2l-3 16.4c-1.3-2.6-2-6-2-10.5 0-11.4 8.3-19.4 20.7-19.4z"/>',
  '<path class="rs-av-line" d="M50.4 47.6h7.2M62.4 47.6h7.2M55.4 62.6c1.4 1.7 3 2.5 4.6 2.5s3.2-.8 4.6-2.5"/>',
  '<circle class="rs-av-eye" cx="54" cy="53.4" r="1.9"/>',
  '<circle class="rs-av-eye" cx="66" cy="53.4" r="1.9"/>',
  '</svg>',
].join('');

/**
 * The frame. Always drawn on the layouts that have one — with the user's
 * picture if there is one, and the stand-in portrait if there is not.
 *
 * `alt` on a real photo is deliberately empty: the name is already the <h1>
 * beside it, and a parser that meets a decorative image with no alt text
 * simply walks past it. The stand-in is inline SVG marked aria-hidden, so it
 * is not in the reading order at all.
 */
function photoBlock(data: ResumeData, cls = 'rs-photo'): string {
  const src = photoSrc(data);
  if (!src) {
    return `<figure class="${cls} rs-photo--stub"${hook('basics|photo')}>${PHOTO_PLACEHOLDER}</figure>`;
  }
  return `<figure class="${cls}"${hook('basics|photo')}><img src="${esc(src)}" alt="" /></figure>`;
}

/** Two letters for the monogram disc; falls back to a single glyph. */
function monogram(name: string): string {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/* ===========================================================================
   Atlas — full-height colour rail, story in the main column.
   =========================================================================== */
function renderAtlas(data: ResumeData, allowLinks: boolean): string {
  const rail = compose([
    `<header class="rs-rail-head"${opens('basics')}>${nameBlock(data)}</header>`,
    section('Contact', contactList(data), 'basics'),
    section('Skills', skillMeters(data.skills), 'skills'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
  ]);

  const main = compose([
    section('Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, false), 'education'),
    section('Projects', projectsBlock(data.projects, true, allowLinks), 'projects'),
    section('Publications & Patents', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);

  return `<aside class="rs-rail">${rail}</aside><div class="rs-main">${main}</div>`;
}

/* ===========================================================================
   Ledger — one column, ruled sections, nothing decorative.
   =========================================================================== */
function renderLedger(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data)}</header>`;

  const duo = [
    section('Certifications', certificationLines(data.certifications), 'certifications'),
    section('Languages', languageInline(data.languages), 'languages'),
  ].filter(Boolean);

  return compose([
    header,
    section('Professional Summary', summaryBlock(data.basics.summary), 'basics'),
    section('Work Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, false), 'education'),
    section('Core Competencies & Skills', skillInline(data.skills, true), 'skills'),
    section('Key Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    duo.length ? `<div class="rs-duo">${duo.join('')}</div>` : '',
    section('Publications & Patents', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);
}

/* ===========================================================================
   Scholar — serif CV. Education leads, publications are numbered.
   =========================================================================== */
function renderScholar(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}><p class="rs-doctype">Curriculum Vitae</p>${nameBlock(data)}${contactList(data)}</header>`;

  return compose([
    header,
    section('Research Interests & Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Appointments & Research Experience', experienceBlock(data.experience), 'experience'),
    section('Funded Projects & Grants', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Methodologies & Technical Competencies', skillInline(data.skills, true), 'skills'),
    section(
      'Certifications & Professional Affiliations',
      certificationLines(data.certifications),
      'certifications',
    ),
    section('Language Proficiencies', languageInline(data.languages), 'languages'),
    section('Publications & Patents', publicationBlock(data.publications, true), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);
}

/* ===========================================================================
   Vertex — colour masthead with a monogram, two columns underneath.
   =========================================================================== */
function badgedSection(title: string, body: string, panel: string, iconName: string): string {
  const label = heading(title, panel);
  if (!label || !body) return '';
  return `<section class="rs-section rs-section--badged"${opens(panel)}><h2 class="rs-section-title"><span class="rs-badge">${icon(iconName)}</span>${esc(label)}</h2><div class="rs-section-body">${body}</div></section>`;
}

function renderVertex(data: ResumeData, allowLinks: boolean): string {
  const contact = contactItems(data, true);

  const masthead = `<header class="rs-masthead"><div class="rs-masthead-main"${opens('basics')}>${nameBlock(data)}${summaryBlock(data.basics.summary)}</div><div class="rs-masthead-side">${
    contact.length ? `<ul class="rs-contact">${contact.join('')}</ul>` : ''
  }</div><div class="rs-monogram"${hook('basics|fullName')}>${esc(monogram(data.basics.fullName))}</div></header>`;

  const left = compose([
    badgedSection('Work Experience', experienceBlock(data.experience), 'experience', 'case'),
    badgedSection('Education', educationBlock(data.education, false), 'education', 'cap'),
  ]);

  const right = compose([
    badgedSection('General Skills', skillDotRows(data.skills), 'skills', 'star'),
    badgedSection('Languages', languageRows(data.languages), 'languages', 'globe'),
    badgedSection(
      'Certifications',
      certificationBlock(data.certifications),
      'certifications',
      'award',
    ),
    badgedSection('Personal Projects', projectsBlock(data.projects, false, allowLinks), 'projects', 'spark'),
    badgedSection('Publications', publicationBlock(data.publications, false), 'publications', 'book'),
    badgedSection('Interests', interestBadges(data.interests), 'interests', 'heart'),
  ]);

  return `${masthead}<div class="rs-columns"><div class="rs-col rs-col--main">${left}</div><div class="rs-col rs-col--side">${right}</div></div>`;
}

/** Two short sections sharing one row, so neither wastes half a page width. */
function duo(parts: string[]): string {
  const kept = parts.filter(Boolean);
  if (!kept.length) return '';
  return `<div class="rs-duo">${kept.join('')}</div>`;
}

/* ===========================================================================
   Beacon — the plainest sheet. One column, black text, ruled headings.
   Built for a strict parser: no panels, no columns, no icons.
   =========================================================================== */
function renderBeacon(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data)}</header>`;

  return compose([
    header,
    section('Summary', summaryBlock(data.basics.summary), 'basics'),
    section('Skills', skillPlain(data.skills), 'skills'),
    section('Professional Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Certifications', certificationLines(data.certifications), 'certifications'),
    section('Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Languages', languageInline(data.languages), 'languages'),
    section('Publications', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);
}

/* ===========================================================================
   Meridian — centred masthead, a competency band, then a plain record.
   =========================================================================== */
function renderMeridian(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data)}</header>`;

  return compose([
    header,
    section('Executive Summary', summaryBlock(data.basics.summary), 'basics'),
    section('Core Competencies', skillGrid(data.skills), 'skills', 'rs-section--band'),
    section('Professional Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Board Roles & Initiatives', projectsBlock(data.projects, false, allowLinks), 'projects'),
    duo([
      section('Certifications', certificationLines(data.certifications), 'certifications'),
      section('Languages', languageInline(data.languages), 'languages'),
    ]),
    section('Speaking & Publications', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);
}

/* ===========================================================================
   Summit — story on the left, a tinted evidence rail down the right.
   =========================================================================== */
function renderSummit(data: ResumeData, allowLinks: boolean): string {
  const main = compose([
    `<header class="rs-header"${opens('basics')}>${nameBlock(data)}</header>`,
    section('Executive Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Leadership Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Selected Initiatives', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Speaking & Publications', publicationBlock(data.publications, false), 'publications'),
  ]);

  const rail = compose([
    section('Contact', contactList(data, true), 'basics'),
    section('Core Strengths', skillGrid(data.skills), 'skills'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);

  return `<div class="rs-main">${main}</div><aside class="rs-rail">${rail}</aside>`;
}

/* ===========================================================================
   Cascade — one column threaded by a timeline spine.
   =========================================================================== */
function renderCascade(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data, true)}</header>`;

  return compose([
    header,
    section('Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Technical Skills', skillChips(data.skills), 'skills'),
    section('Experience', experienceBlock(data.experience), 'experience', 'rs-section--timeline'),
    section(
      'Education',
      educationBlock(data.education, true),
      'education',
      'rs-section--timeline',
    ),
    section('Projects', projectsBlock(data.projects, true, allowLinks), 'projects'),
    duo([
      section('Certifications', certificationLines(data.certifications), 'certifications'),
      section('Languages', languageInline(data.languages), 'languages'),
    ]),
    section('Publications & Talks', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);
}

/* ===========================================================================
   Lattice — slim header rule, then two even columns of dense record.
   =========================================================================== */
function renderLattice(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data)}</header>`;

  const left = compose([
    section('Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
  ]);

  const right = compose([
    section('Key Skills', skillChips(data.skills), 'skills'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Publications', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);

  return `${header}<div class="rs-columns"><div class="rs-col rs-col--main">${left}</div><div class="rs-col rs-col--side">${right}</div></div>`;
}

/* ===========================================================================
   Harbor — a softly tinted rail beside a conventional corporate record.
   =========================================================================== */
function renderHarbor(data: ResumeData, allowLinks: boolean): string {
  const rail = compose([
    section('Contact', contactList(data, true), 'basics'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);

  const main = compose([
    `<header class="rs-header"${opens('basics')}>${nameBlock(data)}</header>`,
    section('Professional Summary', summaryBlock(data.basics.summary), 'basics'),
    section('Key Skills', skillChips(data.skills), 'skills'),
    section('Work Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Publications', publicationBlock(data.publications, false), 'publications'),
  ]);

  return `<aside class="rs-rail">${rail}</aside><div class="rs-main">${main}</div>`;
}

/* ===========================================================================
   Pulse — monogram band, a chip strip of contacts, portfolio-first columns.
   =========================================================================== */
function renderPulse(data: ResumeData, allowLinks: boolean): string {
  const contact = contactItems(data, true);

  const band = `<header class="rs-band"><div class="rs-monogram"${hook('basics|fullName')}>${esc(
    monogram(data.basics.fullName),
  )}</div><div class="rs-band-main"${opens('basics')}>${nameBlock(data)}${summaryBlock(
    data.basics.summary,
  )}</div></header>${
    contact.length ? `<ul class="rs-contact rs-contact--strip">${contact.join('')}</ul>` : ''
  }`;

  const left = compose([
    section('Experience', experienceBlock(data.experience), 'experience'),
    section('Selected Work', projectsBlock(data.projects, true, allowLinks), 'projects'),
    section('Education', educationBlock(data.education, true), 'education'),
  ]);

  const right = compose([
    section('Skills', skillChips(data.skills), 'skills'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Published & Spoken', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestBadges(data.interests), 'interests'),
  ]);

  return `${band}<div class="rs-columns"><div class="rs-col rs-col--main">${left}</div><div class="rs-col rs-col--side">${right}</div></div>`;
}

/* ===========================================================================
   Helix — licences and credentials up top, the clinical record underneath.
   =========================================================================== */
function renderHelix(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data, true)}</header>`;

  return compose([
    header,
    section('Professional Summary', summaryBlock(data.basics.summary), 'basics'),
    section(
      'Licences & Certifications',
      certificationLines(data.certifications),
      'certifications',
      'rs-section--credentials',
    ),
    section('Clinical & Professional Experience', experienceBlock(data.experience), 'experience'),
    section('Education & Training', educationBlock(data.education, true), 'education'),
    section('Clinical Skills & Competencies', skillGrid(data.skills), 'skills'),
    section(
      'Research & Quality Initiatives',
      projectsBlock(data.projects, false, allowLinks),
      'projects',
    ),
    section('Publications & Presentations', publicationBlock(data.publications, true), 'publications'),
    duo([
      section('Languages', languageInline(data.languages), 'languages'),
      section('Professional Interests', interestInline(data.interests), 'interests'),
    ]),
  ]);
}

/* ===========================================================================
   Aperture — square portrait beside the masthead, one plain column below.
   The photo sits in the header only; everything under it is the same ruled,
   single-reading-order sheet a strict parser wants.
   =========================================================================== */
function renderAperture(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header rs-header--photo"${opens('basics')}>${photoBlock(
    data,
    'rs-photo rs-photo--square',
  )}<div class="rs-header-main">${nameBlock(data)}${contactList(data)}</div></header>`;

  return compose([
    header,
    section('Professional Summary', summaryBlock(data.basics.summary), 'basics'),
    section('Core Skills', skillGrid(data.skills), 'skills'),
    section('Work Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    duo([
      section('Certifications', certificationLines(data.certifications), 'certifications'),
      section('Languages', languageInline(data.languages), 'languages'),
    ]),
    section('Publications & Talks', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);
}

/* ===========================================================================
   Cameo — round portrait at the head of a colour rail.
   =========================================================================== */
function renderCameo(data: ResumeData, allowLinks: boolean): string {
  const rail = compose([
    `<header class="rs-rail-head"${opens('basics')}>${photoBlock(
      data,
      'rs-photo rs-photo--round',
    )}${nameBlock(data)}</header>`,
    section('Contact', contactList(data, true), 'basics'),
    section('Skills', skillMeters(data.skills), 'skills'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);

  const main = compose([
    section('Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Publications', publicationBlock(data.publications, false), 'publications'),
  ]);

  return `<aside class="rs-rail">${rail}</aside><div class="rs-main">${main}</div>`;
}

/* ===========================================================================
   Anchor — portrait, name and mandate on one banded executive header.
   =========================================================================== */
function renderAnchor(data: ResumeData, allowLinks: boolean): string {
  const contact = contactItems(data, true);
  const band = `<header class="rs-anchor-band"${opens('basics')}>${photoBlock(
    data,
    'rs-photo rs-photo--round rs-photo--onband',
  )}<div class="rs-anchor-main">${nameBlock(data)}${
    contact.length ? `<ul class="rs-contact rs-contact--onband">${contact.join('')}</ul>` : ''
  }</div></header>`;

  return compose([
    band,
    section('Executive Summary', summaryBlock(data.basics.summary), 'basics'),
    section('Core Competencies', skillGrid(data.skills), 'skills', 'rs-section--band'),
    section('Professional Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Selected Initiatives', projectsBlock(data.projects, false, allowLinks), 'projects'),
    duo([
      section('Certifications', certificationLines(data.certifications), 'certifications'),
      section('Languages', languageInline(data.languages), 'languages'),
    ]),
    section('Speaking & Publications', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);
}

/* ===========================================================================
   Orbit — portrait card over two columns, contact chips across the top.
   =========================================================================== */
function renderOrbit(data: ResumeData, allowLinks: boolean): string {
  const contact = contactItems(data, true);

  const head = `<header class="rs-orbit-head"${opens('basics')}>${photoBlock(
    data,
    'rs-photo rs-photo--card',
  )}<div class="rs-orbit-main">${nameBlock(data)}${summaryBlock(data.basics.summary)}</div></header>${
    contact.length ? `<ul class="rs-contact rs-contact--strip">${contact.join('')}</ul>` : ''
  }`;

  const left = compose([
    section('Experience', experienceBlock(data.experience), 'experience'),
    section('Projects', projectsBlock(data.projects, true, allowLinks), 'projects'),
    section('Education', educationBlock(data.education, true), 'education'),
  ]);

  const right = compose([
    section('Skills', skillChips(data.skills), 'skills'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Publications', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);

  return `${head}<div class="rs-columns"><div class="rs-col rs-col--main">${left}</div><div class="rs-col rs-col--side">${right}</div></div>`;
}

/* ===========================================================================
   Prism — portrait tucked into a tinted panel, credentials underneath.
   =========================================================================== */
function renderPrism(data: ResumeData, allowLinks: boolean): string {
  const rail = compose([
    `<div class="rs-prism-portrait"${opens('basics')}>${photoBlock(
      data,
      'rs-photo rs-photo--square',
    )}</div>`,
    section('Contact', contactList(data, true), 'basics'),
    section('Key Skills', skillChips(data.skills), 'skills'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]);

  const main = compose([
    `<header class="rs-header"${opens('basics')}>${nameBlock(data)}</header>`,
    section('Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Certifications', certificationLines(data.certifications), 'certifications'),
    section('Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Publications', publicationBlock(data.publications, false), 'publications'),
  ]);

  return `<aside class="rs-rail">${rail}</aside><div class="rs-main">${main}</div>`;
}

export interface RenderOptions {
  /**
   * Thumbnails are decorative and often sit inside a link of their own, and
   * nested anchors make the HTML parser re-nest the whole sheet. Pass false
   * there and URLs render as plain text.
   */
  links?: boolean;
}

/**
 * Returns the inner HTML of a single A4 sheet. The caller owns the wrapper so
 * the same markup works for the live preview and the printable root.
 */
export function renderResume(
  data: ResumeData,
  templateId: string,
  options: RenderOptions = {},
): string {
  const allowLinks = options.links !== false;
  headings = data.sections ?? {};
  sectionOrder = data.order ?? [];

  switch (resolveTemplate(templateId)) {
    case 'ledger':
      return renderLedger(data, allowLinks);
    case 'scholar':
      return renderScholar(data, allowLinks);
    case 'vertex':
      return renderVertex(data, allowLinks);
    case 'beacon':
      return renderBeacon(data, allowLinks);
    case 'meridian':
      return renderMeridian(data, allowLinks);
    case 'summit':
      return renderSummit(data, allowLinks);
    case 'cascade':
      return renderCascade(data, allowLinks);
    case 'lattice':
      return renderLattice(data, allowLinks);
    case 'harbor':
      return renderHarbor(data, allowLinks);
    case 'pulse':
      return renderPulse(data, allowLinks);
    case 'helix':
      return renderHelix(data, allowLinks);
    case 'aperture':
      return renderAperture(data, allowLinks);
    case 'cameo':
      return renderCameo(data, allowLinks);
    case 'anchor':
      return renderAnchor(data, allowLinks);
    case 'orbit':
      return renderOrbit(data, allowLinks);
    case 'prism':
      return renderPrism(data, allowLinks);
    default:
      return renderAtlas(data, allowLinks);
  }
}

/* ===========================================================================
   What one template calls its sections, and the order it prints them in.

   The editor's rail has to say "Core Competencies & Skills" on Ledger and
   "Technical Skills" on Cascade, in each template's own running order. Rather
   than keep a second table alongside seventeen render functions — which would
   drift the first time a heading is reworded — the sheet is asked directly:
   render the template once against a probe with one entry in every section,
   then read the headings back off it in document order.
   =========================================================================== */
export interface SectionInfo {
  key: SectionKey;
  heading: string;
}

const PROBE: ResumeData = {
  basics: {
    fullName: 'A',
    title: 'A',
    email: 'a@a.co',
    phone: 'a',
    location: 'a',
    website: '',
    linkedin: '',
    github: '',
    summary: 'a',
  },
  experience: [{ id: 'p', role: 'a', company: 'a', location: '', start: '', end: '', bullets: 'a' }],
  education: [{ id: 'p', degree: 'a', school: 'a', location: '', start: '', end: '', note: '' }],
  projects: [{ id: 'p', name: 'a', link: '', description: 'a', tech: 'a' }],
  skills: [{ id: 'p', name: 'a', level: 5 }],
  languages: [{ id: 'p', name: 'a', level: 'a' }],
  certifications: [{ id: 'p', name: 'a', issuer: 'a', date: 'a' }],
  publications: [{ id: 'p', title: 'a', meta: 'a' }],
  interests: [{ id: 'p', name: 'a' }],
};

const sectionInfoCache = new Map<string, SectionInfo[]>();

/**
 * Every section this template prints, in printed order, with the heading it
 * gives each one. Browser only — it parses the rendered sheet. Returns an
 * empty list where there is no DOM, and callers fall back to their defaults.
 */
export function templateSectionInfo(templateId: string): SectionInfo[] {
  const id = resolveTemplate(templateId);
  const cached = sectionInfoCache.get(id);
  if (cached) return cached;
  if (typeof DOMParser === 'undefined') return [];

  // renderResume sets the module-level heading and order state; the probe must
  // not leave its own behind for whatever render comes next.
  const keptHeadings = headings;
  const keptOrder = sectionOrder;
  const html = renderResume(PROBE, id, { links: false });
  headings = keptHeadings;
  sectionOrder = keptOrder;

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const seen = new Set<string>();
  const out: SectionInfo[] = [];

  doc.querySelectorAll<HTMLElement>('[data-e-open]').forEach((node) => {
    const key = node.dataset.eOpen as SectionKey;
    if (!SECTION_KEYS.includes(key) || seen.has(key)) return;
    const title = node.querySelector('.rs-section-title')?.textContent?.trim();
    if (!title) return;
    seen.add(key);
    out.push({ key, heading: title });
  });

  sectionInfoCache.set(id, out);
  return out;
}

/* ===========================================================================
   Cover letter.

   One A4 sheet that borrows the resume's accent and type, so the two
   documents read as one application. Deliberately plain: a letterhead, a
   date, an inside address, a subject line, paragraphs, a sign-off.
   =========================================================================== */
function paragraphs(value: string): string[] {
  return clean(value)
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

export function renderCoverLetter(data: ResumeData): string {
  const letter = data.coverLetter ?? EMPTY_COVER_LETTER;
  const name = clean(data.basics.fullName);

  const letterhead = `<header class="cl-head"${opens('basics')}>${
    name
      ? `<h1 class="cl-name"${hook('basics|fullName')}>${esc(name)}</h1>`
      : '<h1 class="cl-name rs-placeholder">Your name</h1>'
  }${
    clean(data.basics.title)
      ? `<p class="cl-role"${hook('basics|title')}>${esc(clean(data.basics.title))}</p>`
      : ''
  }${contactList(data)}</header>`;

  const date = clean(letter.date)
    ? `<p class="cl-date"${hook('cover|date')}>${esc(clean(letter.date))}</p>`
    : '';

  const addressLines = [
    clean(letter.recipient) && `<span${hook('cover|recipient')}>${esc(clean(letter.recipient))}</span>`,
    clean(letter.recipientTitle) &&
      `<span${hook('cover|recipientTitle')}>${esc(clean(letter.recipientTitle))}</span>`,
    clean(letter.company) && `<span${hook('cover|company')}>${esc(clean(letter.company))}</span>`,
    clean(letter.companyAddress) &&
      `<span${hook('cover|companyAddress')}>${esc(clean(letter.companyAddress))}</span>`,
  ].filter(Boolean) as string[];

  const address = addressLines.length
    ? `<address class="cl-address">${addressLines.join('')}</address>`
    : '';

  const subject = clean(letter.role)
    ? `<p class="cl-subject"${hook('cover|role')}>Re: ${esc(clean(letter.role))}</p>`
    : '';

  const greeting = clean(letter.greeting)
    ? `<p class="cl-greeting"${hook('cover|greeting')}>${esc(clean(letter.greeting))}</p>`
    : '';

  const blocks = paragraphs(letter.body);
  const body = blocks.length
    ? `<div class="cl-body"${hook('cover|body')}>${blocks
        .map((block) => `<p>${esc(block)}</p>`)
        .join('')}</div>`
    : `<div class="cl-body cl-body--empty"${hook('cover|body')}><p>Your letter goes here. Three short paragraphs is plenty: why this role, what you have actually done that proves you can do it, and what you would like to happen next.</p></div>`;

  const signOff = `<div class="cl-signoff">${
    clean(letter.signOff)
      ? `<p${hook('cover|signOff')}>${esc(clean(letter.signOff))}</p>`
      : ''
  }${name ? `<p class="cl-signature"${hook('basics|fullName')}>${esc(name)}</p>` : ''}</div>`;

  return `${letterhead}<div class="cl-meta">${date}${address}</div>${subject}${greeting}${body}${signOff}`;
}

export function letterClass(templateId: string): string {
  return `resume-sheet cover-letter t-${resolveTemplate(templateId)}`;
}

export function sheetClass(templateId: string): string {
  return `resume-sheet t-${resolveTemplate(templateId)}`;
}

/** How the sheet is typeset, on top of its accent. */
export interface SheetType {
  font?: string | null;
  size?: string | null;
}

/**
 * Inline custom properties, so one stylesheet serves every accent and every
 * typeface. `--rs-font` is emitted only when a face has actually been chosen:
 * leaving it off is what lets a template keep the type it was designed with.
 */
export function sheetStyle(accentId: string, type: SheetType = {}): string {
  const accent = resolveAccent(accentId);
  const font = resolveFont(type.font);
  const size = resolveFontSize(type.size);
  return [
    `--rs-accent:${accent.hex}`,
    `--rs-accent-hi:${accent.hi}`,
    font.stack ? `--rs-font:${font.stack}` : '',
    `--rs-scale:${size.scale}`,
  ]
    .filter(Boolean)
    .join(';');
}

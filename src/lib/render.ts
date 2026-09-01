import type {
  CertificationItem,
  EducationItem,
  ExperienceItem,
  InterestItem,
  LanguageItem,
  ProjectItem,
  PublicationItem,
  ResumeData,
  SectionMeta,
  SkillItem,
} from './types';
import { resolveAccent, resolveTemplate } from './templates';

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
  const rail = [
    `<header class="rs-rail-head"${opens('basics')}>${nameBlock(data)}</header>`,
    section('Contact', contactList(data), 'basics'),
    section('Skills', skillMeters(data.skills), 'skills'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
  ]
    .filter(Boolean)
    .join('');

  const main = [
    section('Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, false), 'education'),
    section('Projects', projectsBlock(data.projects, true, allowLinks), 'projects'),
    section('Publications & Patents', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]
    .filter(Boolean)
    .join('');

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

  return [
    header,
    section('Professional Summary', summaryBlock(data.basics.summary), 'basics'),
    section('Work Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, false), 'education'),
    section('Core Competencies & Skills', skillInline(data.skills, true), 'skills'),
    section('Key Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    duo.length ? `<div class="rs-duo">${duo.join('')}</div>` : '',
    section('Publications & Patents', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]
    .filter(Boolean)
    .join('');
}

/* ===========================================================================
   Scholar — serif CV. Education leads, publications are numbered.
   =========================================================================== */
function renderScholar(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}><p class="rs-doctype">Curriculum Vitae</p>${nameBlock(data)}${contactList(data)}</header>`;

  return [
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
  ]
    .filter(Boolean)
    .join('');
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

  const left = [
    badgedSection('Work Experience', experienceBlock(data.experience), 'experience', 'case'),
    badgedSection('Education', educationBlock(data.education, false), 'education', 'cap'),
  ]
    .filter(Boolean)
    .join('');

  const right = [
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
  ]
    .filter(Boolean)
    .join('');

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

  return [
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
  ]
    .filter(Boolean)
    .join('');
}

/* ===========================================================================
   Meridian — centred masthead, a competency band, then a plain record.
   =========================================================================== */
function renderMeridian(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data)}</header>`;

  return [
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
  ]
    .filter(Boolean)
    .join('');
}

/* ===========================================================================
   Summit — story on the left, a tinted evidence rail down the right.
   =========================================================================== */
function renderSummit(data: ResumeData, allowLinks: boolean): string {
  const main = [
    `<header class="rs-header"${opens('basics')}>${nameBlock(data)}</header>`,
    section('Executive Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Leadership Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Selected Initiatives', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Speaking & Publications', publicationBlock(data.publications, false), 'publications'),
  ]
    .filter(Boolean)
    .join('');

  const rail = [
    section('Contact', contactList(data, true), 'basics'),
    section('Core Strengths', skillGrid(data.skills), 'skills'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]
    .filter(Boolean)
    .join('');

  return `<div class="rs-main">${main}</div><aside class="rs-rail">${rail}</aside>`;
}

/* ===========================================================================
   Cascade — one column threaded by a timeline spine.
   =========================================================================== */
function renderCascade(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data, true)}</header>`;

  return [
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
  ]
    .filter(Boolean)
    .join('');
}

/* ===========================================================================
   Lattice — slim header rule, then two even columns of dense record.
   =========================================================================== */
function renderLattice(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data)}</header>`;

  const left = [
    section('Profile', summaryBlock(data.basics.summary), 'basics'),
    section('Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
  ]
    .filter(Boolean)
    .join('');

  const right = [
    section('Key Skills', skillChips(data.skills), 'skills'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Publications', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]
    .filter(Boolean)
    .join('');

  return `${header}<div class="rs-columns"><div class="rs-col rs-col--main">${left}</div><div class="rs-col rs-col--side">${right}</div></div>`;
}

/* ===========================================================================
   Harbor — a softly tinted rail beside a conventional corporate record.
   =========================================================================== */
function renderHarbor(data: ResumeData, allowLinks: boolean): string {
  const rail = [
    section('Contact', contactList(data, true), 'basics'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Interests', interestInline(data.interests), 'interests'),
  ]
    .filter(Boolean)
    .join('');

  const main = [
    `<header class="rs-header"${opens('basics')}>${nameBlock(data)}</header>`,
    section('Professional Summary', summaryBlock(data.basics.summary), 'basics'),
    section('Key Skills', skillChips(data.skills), 'skills'),
    section('Work Experience', experienceBlock(data.experience), 'experience'),
    section('Education', educationBlock(data.education, true), 'education'),
    section('Projects', projectsBlock(data.projects, false, allowLinks), 'projects'),
    section('Publications', publicationBlock(data.publications, false), 'publications'),
  ]
    .filter(Boolean)
    .join('');

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

  const left = [
    section('Experience', experienceBlock(data.experience), 'experience'),
    section('Selected Work', projectsBlock(data.projects, true, allowLinks), 'projects'),
    section('Education', educationBlock(data.education, true), 'education'),
  ]
    .filter(Boolean)
    .join('');

  const right = [
    section('Skills', skillChips(data.skills), 'skills'),
    section('Certifications', certificationBlock(data.certifications), 'certifications'),
    section('Languages', languageRows(data.languages), 'languages'),
    section('Published & Spoken', publicationBlock(data.publications, false), 'publications'),
    section('Interests', interestBadges(data.interests), 'interests'),
  ]
    .filter(Boolean)
    .join('');

  return `${band}<div class="rs-columns"><div class="rs-col rs-col--main">${left}</div><div class="rs-col rs-col--side">${right}</div></div>`;
}

/* ===========================================================================
   Helix — licences and credentials up top, the clinical record underneath.
   =========================================================================== */
function renderHelix(data: ResumeData, allowLinks: boolean): string {
  const header = `<header class="rs-header"${opens('basics')}>${nameBlock(data)}${contactList(data, true)}</header>`;

  return [
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
  ]
    .filter(Boolean)
    .join('');
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
    default:
      return renderAtlas(data, allowLinks);
  }
}

export function sheetClass(templateId: string): string {
  return `resume-sheet t-${resolveTemplate(templateId)}`;
}

/** Inline custom properties, so one stylesheet serves every accent. */
export function sheetStyle(accentId: string): string {
  const accent = resolveAccent(accentId);
  return `--rs-accent:${accent.hex};--rs-accent-hi:${accent.hi}`;
}

import type { EducationItem, ExperienceItem, ProjectItem, ResumeData } from './types';
import { resolveTemplate } from './templates';

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

/** Renders "2022 — Present", collapsing gracefully when only one side exists. */
function dateRange(start: string, end: string): string {
  const a = clean(start);
  const b = clean(end);
  if (a && b) return `${esc(a)} — ${esc(b)}`;
  return esc(a || b);
}

function section(title: string, body: string): string {
  if (!body) return '';
  return `<section class="rs-section"><h2 class="rs-section-title">${esc(title)}</h2><div class="rs-section-body">${body}</div></section>`;
}

function contactList(data: ResumeData): string {
  const { email, phone, location, website, linkedin } = data.basics;
  const items = [email, phone, location, website, linkedin].map(clean).filter(Boolean);
  if (!items.length) return '';
  return `<ul class="rs-contact">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function header(data: ResumeData, withContact: boolean): string {
  const name = clean(data.basics.fullName);
  const title = clean(data.basics.title);
  const nameHtml = name
    ? `<h1 class="rs-name">${esc(name)}</h1>`
    : `<h1 class="rs-name rs-placeholder">Your name</h1>`;
  const titleHtml = title ? `<p class="rs-role">${esc(title)}</p>` : '';
  return `<header class="rs-header">${nameHtml}${titleHtml}${withContact ? contactList(data) : ''}</header>`;
}

function experienceBlock(items: ExperienceItem[]): string {
  return items
    .filter((item) => clean(item.role) || clean(item.company) || clean(item.bullets))
    .map((item) => {
      const org = [clean(item.company), clean(item.location)].filter(Boolean).join(' · ');
      const bullets = lines(item.bullets);
      return `<article class="rs-entry">
        <div class="rs-entry-head">
          <h3 class="rs-entry-title">${esc(clean(item.role))}</h3>
          <span class="rs-entry-meta">${dateRange(item.start, item.end)}</span>
        </div>
        ${org ? `<p class="rs-entry-org">${esc(org)}</p>` : ''}
        ${bullets.length ? `<ul class="rs-bullets">${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
      </article>`;
    })
    .join('');
}

function educationBlock(items: EducationItem[]): string {
  return items
    .filter((item) => clean(item.degree) || clean(item.school))
    .map((item) => {
      const org = [clean(item.school), clean(item.location)].filter(Boolean).join(' · ');
      const note = clean(item.note);
      return `<article class="rs-entry">
        <div class="rs-entry-head">
          <h3 class="rs-entry-title">${esc(clean(item.degree))}</h3>
          <span class="rs-entry-meta">${dateRange(item.start, item.end)}</span>
        </div>
        ${org ? `<p class="rs-entry-org">${esc(org)}</p>` : ''}
        ${note ? `<p class="rs-entry-org">${esc(note)}</p>` : ''}
      </article>`;
    })
    .join('');
}

function projectsBlock(items: ProjectItem[]): string {
  return items
    .filter((item) => clean(item.name) || clean(item.description))
    .map((item) => {
      const link = clean(item.link);
      return `<article class="rs-entry">
        <div class="rs-entry-head">
          <h3 class="rs-entry-title">${esc(clean(item.name))}</h3>
          ${link ? `<span class="rs-entry-meta">${esc(link)}</span>` : ''}
        </div>
        ${item.description ? `<p class="rs-entry-org">${esc(clean(item.description))}</p>` : ''}
      </article>`;
    })
    .join('');
}

function skillsBlock(skills: string): string {
  const items = list(skills);
  if (!items.length) return '';
  return `<ul class="rs-skills">${items.map((s) => `<li class="rs-skill">${esc(s)}</li>`).join('')}</ul>`;
}

function summaryBlock(summary: string): string {
  const text = clean(summary);
  return text ? `<p class="rs-summary">${esc(text)}</p>` : '';
}

/**
 * Returns the inner HTML of a single A4 sheet. The caller owns the wrapper so
 * the same markup works for the live preview and the printable root.
 */
export function renderResume(data: ResumeData, templateId: string): string {
  const template = resolveTemplate(templateId);

  const summary = section('Summary', summaryBlock(data.basics.summary));
  const experience = section('Experience', experienceBlock(data.experience));
  const education = section('Education', educationBlock(data.education));
  const projects = section('Projects', projectsBlock(data.projects));
  const skills = section('Skills', skillsBlock(data.skills));

  if (template === 'meridian') {
    // Sidebar carries the scannable facts; the main column carries the story.
    const aside = [section('Contact', contactList(data)), skills, education]
      .filter(Boolean)
      .join('');
    const main = [header(data, false), summary, experience, projects].filter(Boolean).join('');
    return `<aside class="rs-aside">${aside}</aside><div class="rs-main">${main}</div>`;
  }

  return [header(data, true), summary, experience, education, projects, skills]
    .filter(Boolean)
    .join('');
}

export function sheetClass(templateId: string): string {
  return `resume-sheet t-${resolveTemplate(templateId)}`;
}

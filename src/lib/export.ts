/**
 * Taking the resume out of the browser.
 *
 * Three ways out, all of them local: the print dialog for a PDF, a real .docx
 * for anyone who has been asked to send a Word file, and the whole thing as
 * plain text for pasting into an application form. Nothing here uploads
 * anything or reaches for a library — the ZIP and the WordprocessingML are
 * written by hand so the download works offline and stays auditable.
 */
import type { CoverLetter, ResumeData, SectionKey } from './types';
import { EMPTY_COVER_LETTER } from './sample';

/* ===========================================================================
   A minimal store-only ZIP writer.

   A .docx is a ZIP of XML parts. Everything here is stored uncompressed —
   a resume is a few kilobytes of text, so deflate would buy nothing and cost
   a dependency.
   =========================================================================== */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  bytes: Uint8Array;
  crc: number;
  offset: number;
}

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

/** Builds a ZIP archive from named text parts. */
function zip(parts: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  const push = (data: number[] | Uint8Array): void => {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    chunks.push(bytes);
    offset += bytes.length;
  };

  for (const part of parts) {
    const name = encoder.encode(part.name);
    const bytes = encoder.encode(part.content);
    const crc = crc32(bytes);
    entries.push({ name: part.name, bytes, crc, offset });

    push([
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(0x0800), // UTF-8 filenames
      ...u16(0), // stored, no compression
      ...u16(0), // mod time
      ...u16(0x21), // mod date — 1980-01-01, so archives are reproducible
      ...u32(crc),
      ...u32(bytes.length),
      ...u32(bytes.length),
      ...u16(name.length),
      ...u16(0),
    ]);
    push(name);
    push(bytes);
  }

  const centralStart = offset;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    push([
      ...u32(0x02014b50),
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0x0800),
      ...u16(0),
      ...u16(0),
      ...u16(0x21),
      ...u32(entry.crc),
      ...u32(entry.bytes.length),
      ...u32(entry.bytes.length),
      ...u16(name.length),
      ...u16(0), // extra
      ...u16(0), // comment
      ...u16(0), // disk
      ...u16(0), // internal attrs
      ...u32(0), // external attrs
      ...u32(entry.offset),
    ]);
    push(name);
  }

  push([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(offset - centralStart),
    ...u32(centralStart),
    ...u16(0),
  ]);

  return new Blob(chunks as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/* ===========================================================================
   WordprocessingML
   =========================================================================== */
function xml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Control characters are not legal in XML 1.0 and would make Word refuse
    // the file outright, so they are dropped rather than escaped.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

interface RunOptions {
  bold?: boolean;
  italic?: boolean;
  caps?: boolean;
  /** Half-points, matching Word's own unit. */
  size?: number;
  color?: string;
}

function run(text: string, options: RunOptions = {}): string {
  const props = [
    options.bold ? '<w:b/>' : '',
    options.italic ? '<w:i/>' : '',
    options.caps ? '<w:caps/>' : '',
    options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : '',
    options.color ? `<w:color w:val="${options.color.replace('#', '')}"/>` : '',
  ].join('');
  const rPr = props ? `<w:rPr>${props}</w:rPr>` : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

interface ParagraphOptions {
  /** Twips before the paragraph. */
  before?: number;
  after?: number;
  align?: 'center' | 'left';
  /** Draws a rule under the paragraph — how section headings are separated. */
  rule?: string;
  /** Hanging indent, for bullets. */
  bullet?: boolean;
  tabRight?: boolean;
}

/** A4 minus 15mm margins, in twips — where the right-aligned tab stop sits. */
const CONTENT_WIDTH_TWIPS = 9070;

function para(runs: string, options: ParagraphOptions = {}): string {
  const spacing = `<w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 60}"/>`;
  const align = options.align === 'center' ? '<w:jc w:val="center"/>' : '';
  const border = options.rule
    ? `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="${options.rule.replace('#', '')}"/></w:pBdr>`
    : '';
  const indent = options.bullet ? '<w:ind w:left="340" w:hanging="200"/>' : '';
  const tabs = options.tabRight
    ? `<w:tabs><w:tab w:val="right" w:pos="${CONTENT_WIDTH_TWIPS}"/></w:tabs>`
    : '';
  return `<w:p><w:pPr>${tabs}${spacing}${align}${border}${indent}</w:pPr>${runs}</w:p>`;
}

/** A run that jumps to the right-hand tab stop — used for date ranges. */
function tab(): string {
  return '<w:r><w:tab/></w:r>';
}

/* --- Turning a resume into paragraphs -------------------------------------- */
function clean(value: string): string {
  return (value ?? '').trim();
}

function bulletLines(value: string): string[] {
  return clean(value)
    .split('\n')
    .map((line) => line.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean);
}

function range(start: string, end: string): string {
  const a = clean(start);
  const b = clean(end);
  if (!a && !b) return '';
  return a && b ? `${a} — ${b}` : a || b;
}

/** The sections to print, in order, with the heading the template gives each. */
export interface ExportSection {
  key: SectionKey;
  heading: string;
}

export interface ExportOptions {
  sections: ExportSection[];
  accent: string;
  /** Appended as a second page when the user asked for the letter too. */
  coverLetter?: boolean;
}

function contactLine(data: ResumeData): string {
  return [
    data.basics.email,
    data.basics.phone,
    data.basics.location,
    data.basics.website,
    data.basics.linkedin,
    data.basics.github,
  ]
    .map(clean)
    .filter(Boolean)
    .join('  ·  ');
}

function heading(text: string, accent: string): string {
  return para(run(text, { bold: true, caps: true, size: 18, color: accent }), {
    before: 220,
    after: 80,
    rule: accent,
  });
}

function sectionBody(data: ResumeData, key: SectionKey): string {
  switch (key) {
    case 'experience':
      return data.experience
        .filter((item) => clean(item.role) || clean(item.company))
        .map((item) => {
          const dates = range(item.start, item.end);
          const head = para(
            run(clean(item.role), { bold: true, size: 21 }) +
              (dates ? tab() + run(dates, { size: 18 }) : ''),
            { before: 120, after: 0, tabRight: true },
          );
          const org = [clean(item.company), clean(item.location)].filter(Boolean).join(' · ');
          const sub = org ? para(run(org, { size: 19 }), { after: 40 }) : '';
          const bullets = bulletLines(item.bullets)
            .map((line) => para(run('•  ') + run(line), { after: 30, bullet: true }))
            .join('');
          return head + sub + bullets;
        })
        .join('');

    case 'education':
      return data.education
        .filter((item) => clean(item.degree) || clean(item.school))
        .map((item) => {
          const dates = range(item.start, item.end);
          const head = para(
            run(clean(item.degree), { bold: true, size: 21 }) +
              (dates ? tab() + run(dates, { size: 18 }) : ''),
            { before: 120, after: 0, tabRight: true },
          );
          const org = [clean(item.school), clean(item.location)].filter(Boolean).join(' · ');
          const sub = org ? para(run(org, { size: 19 }), { after: 30 }) : '';
          const note = clean(item.note) ? para(run(clean(item.note), { size: 19 })) : '';
          return head + sub + note;
        })
        .join('');

    case 'skills': {
      const names = data.skills.map((item) => clean(item.name)).filter(Boolean);
      return names.length ? para(run(names.join('  ·  '))) : '';
    }

    case 'languages': {
      const rows = data.languages
        .filter((item) => clean(item.name))
        .map((item) =>
          clean(item.level) ? `${clean(item.name)} (${clean(item.level)})` : clean(item.name),
        );
      return rows.length ? para(run(rows.join('  ·  '))) : '';
    }

    case 'projects':
      return data.projects
        .filter((item) => clean(item.name) || clean(item.description))
        .map((item) => {
          const head = para(
            run(clean(item.name), { bold: true, size: 21 }) +
              (clean(item.link) ? tab() + run(clean(item.link), { size: 18 }) : ''),
            { before: 120, after: 0, tabRight: true },
          );
          const desc = clean(item.description) ? para(run(clean(item.description))) : '';
          const tech = clean(item.tech)
            ? para(run(`Technologies: ${clean(item.tech)}`, { italic: true, size: 18 }))
            : '';
          return head + desc + tech;
        })
        .join('');

    case 'certifications':
      return data.certifications
        .filter((item) => clean(item.name))
        .map((item) => {
          const meta = [clean(item.issuer), clean(item.date)].filter(Boolean).join(', ');
          return para(
            run(clean(item.name), { bold: true }) + (meta ? run(` — ${meta}`, { size: 19 }) : ''),
            { after: 40 },
          );
        })
        .join('');

    case 'publications':
      return data.publications
        .filter((item) => clean(item.title))
        .map((item) =>
          para(
            run(clean(item.title)) +
              (clean(item.meta) ? run(` — ${clean(item.meta)}`, { size: 19 }) : ''),
            { after: 40 },
          ),
        )
        .join('');

    case 'interests': {
      const names = data.interests.map((item) => clean(item.name)).filter(Boolean);
      return names.length ? para(run(names.join('  ·  '))) : '';
    }

    default:
      return '';
  }
}

/**
 * The letter as Word paragraphs. `pageBreak` is what distinguishes the letter
 * appended to a resume — which has to start on a fresh sheet — from a letter
 * downloaded on its own, where a leading break would produce a blank page one.
 */
function letterParagraphs(
  letter: CoverLetter,
  data: ResumeData,
  accent: string,
  pageBreak = true,
): string {
  const name = clean(data.basics.fullName);
  const blocks = clean(letter.body)
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);

  const address = [
    clean(letter.recipient),
    clean(letter.recipientTitle),
    clean(letter.company),
    clean(letter.companyAddress),
  ]
    .filter(Boolean)
    .map((line) => para(run(line, { size: 19 }), { after: 20 }))
    .join('');

  return (
    (pageBreak ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : '') +
    para(run(name || 'Your name', { bold: true, size: 32, color: accent }), {
      after: 40,
    }) +
    (clean(data.basics.title) ? para(run(clean(data.basics.title), { size: 20 }), { after: 40 }) : '') +
    para(run(contactLine(data), { size: 17 }), { after: 200, rule: accent }) +
    (clean(letter.date) ? para(run(clean(letter.date), { size: 19 }), { after: 160 }) : '') +
    address +
    (clean(letter.role)
      ? para(run(`Re: ${clean(letter.role)}`, { bold: true }), { before: 200, after: 160 })
      : '') +
    (clean(letter.greeting) ? para(run(clean(letter.greeting)), { after: 160 }) : '') +
    blocks.map((block) => para(run(block), { after: 160 })).join('') +
    (clean(letter.signOff) ? para(run(clean(letter.signOff)), { before: 160, after: 240 }) : '') +
    (name ? para(run(name, { bold: true })) : '')
  );
}

function documentXml(data: ResumeData, options: ExportOptions): string {
  const accent = options.accent;
  const name = clean(data.basics.fullName);

  const header =
    para(run(name || 'Your name', { bold: true, size: 40, color: accent }), { after: 40 }) +
    (clean(data.basics.title)
      ? para(run(clean(data.basics.title), { size: 22 }), { after: 60 })
      : '') +
    para(run(contactLine(data), { size: 17 }), { after: 120, rule: accent });

  const summary = clean(data.basics.summary)
    ? heading('Professional Summary', accent) + para(run(clean(data.basics.summary)))
    : '';

  const body = options.sections
    .map((entry) => {
      const content = sectionBody(data, entry.key);
      return content ? heading(entry.heading, accent) + content : '';
    })
    .join('');

  const letter =
    options.coverLetter && data.coverLetter
      ? letterParagraphs(data.coverLetter, data, accent)
      : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${header}${summary}${body}${letter}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const DOC_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

/** A .docx of the resume — real Word, not HTML wearing a Word extension. */
export function buildDocx(data: ResumeData, options: ExportOptions): Blob {
  return zip([
    { name: '[Content_Types].xml', content: CONTENT_TYPES_XML },
    { name: '_rels/.rels', content: ROOT_RELS_XML },
    { name: 'word/_rels/document.xml.rels', content: DOC_RELS_XML },
    { name: 'word/document.xml', content: documentXml(data, options) },
    { name: 'word/styles.xml', content: STYLES_XML },
  ]);
}

function letterDocumentXml(data: ResumeData, accent: string): string {
  const letter = data.coverLetter ?? EMPTY_COVER_LETTER;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${letterParagraphs(
    letter,
    data,
    accent,
    false,
  )}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

/** The cover letter on its own — one page, no resume attached to it. */
export function buildCoverLetterDocx(data: ResumeData, accent: string): Blob {
  return zip([
    { name: '[Content_Types].xml', content: CONTENT_TYPES_XML },
    { name: '_rels/.rels', content: ROOT_RELS_XML },
    { name: 'word/_rels/document.xml.rels', content: DOC_RELS_XML },
    { name: 'word/document.xml', content: letterDocumentXml(data, accent) },
    { name: 'word/styles.xml', content: STYLES_XML },
  ]);
}

/* ===========================================================================
   Plain text — for the copy button, and for pasting into an application form
   that will not take an attachment.
   =========================================================================== */
export function buildPlainText(data: ResumeData, options: ExportOptions): string {
  const out: string[] = [];
  const push = (line = ''): void => {
    out.push(line);
  };

  if (clean(data.basics.fullName)) push(clean(data.basics.fullName).toUpperCase());
  if (clean(data.basics.title)) push(clean(data.basics.title));
  const contact = contactLine(data);
  if (contact) push(contact);

  if (clean(data.basics.summary)) {
    push();
    push('PROFESSIONAL SUMMARY');
    push(clean(data.basics.summary));
  }

  for (const entry of options.sections) {
    const lines: string[] = [];

    if (entry.key === 'experience') {
      for (const item of data.experience) {
        if (!clean(item.role) && !clean(item.company)) continue;
        const dates = range(item.start, item.end);
        lines.push([clean(item.role), dates].filter(Boolean).join(' — '));
        const org = [clean(item.company), clean(item.location)].filter(Boolean).join(' · ');
        if (org) lines.push(org);
        bulletLines(item.bullets).forEach((line) => lines.push(`- ${line}`));
        lines.push('');
      }
    } else if (entry.key === 'education') {
      for (const item of data.education) {
        if (!clean(item.degree) && !clean(item.school)) continue;
        const dates = range(item.start, item.end);
        lines.push([clean(item.degree), dates].filter(Boolean).join(' — '));
        const org = [clean(item.school), clean(item.location)].filter(Boolean).join(' · ');
        if (org) lines.push(org);
        if (clean(item.note)) lines.push(clean(item.note));
        lines.push('');
      }
    } else if (entry.key === 'skills') {
      const names = data.skills.map((item) => clean(item.name)).filter(Boolean);
      if (names.length) lines.push(names.join(', '));
    } else if (entry.key === 'languages') {
      data.languages.forEach((item) => {
        if (!clean(item.name)) return;
        lines.push(clean(item.level) ? `${clean(item.name)} — ${clean(item.level)}` : clean(item.name));
      });
    } else if (entry.key === 'projects') {
      for (const item of data.projects) {
        if (!clean(item.name) && !clean(item.description)) continue;
        lines.push([clean(item.name), clean(item.link)].filter(Boolean).join(' — '));
        if (clean(item.description)) lines.push(clean(item.description));
        if (clean(item.tech)) lines.push(`Technologies: ${clean(item.tech)}`);
        lines.push('');
      }
    } else if (entry.key === 'certifications') {
      data.certifications.forEach((item) => {
        if (!clean(item.name)) return;
        const meta = [clean(item.issuer), clean(item.date)].filter(Boolean).join(', ');
        lines.push(meta ? `${clean(item.name)} — ${meta}` : clean(item.name));
      });
    } else if (entry.key === 'publications') {
      data.publications.forEach((item) => {
        if (!clean(item.title)) return;
        lines.push(
          clean(item.meta) ? `${clean(item.title)} — ${clean(item.meta)}` : clean(item.title),
        );
      });
    } else if (entry.key === 'interests') {
      const names = data.interests.map((item) => clean(item.name)).filter(Boolean);
      if (names.length) lines.push(names.join(', '));
    }

    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    if (!lines.length) continue;

    push();
    push(entry.heading.toUpperCase());
    lines.forEach(push);
  }

  if (options.coverLetter) {
    push();
    push('—'.repeat(40));
    push('COVER LETTER');
    letterLines(data).forEach(push);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** The letter's own lines, shared by the combined copy and the letter-only one. */
function letterLines(data: ResumeData): string[] {
  const letter = data.coverLetter ?? EMPTY_COVER_LETTER;
  const out: string[] = [''];
  const push = (line = ''): void => {
    out.push(line);
  };

  if (clean(letter.date)) push(clean(letter.date));
  [letter.recipient, letter.recipientTitle, letter.company, letter.companyAddress]
    .map(clean)
    .filter(Boolean)
    .forEach(push);
  if (clean(letter.role)) {
    push();
    push(`Re: ${clean(letter.role)}`);
  }
  if (clean(letter.greeting)) {
    push();
    push(clean(letter.greeting));
  }
  clean(letter.body)
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .forEach((block) => {
      push();
      push(block);
    });
  if (clean(letter.signOff)) {
    push();
    push(clean(letter.signOff));
  }
  if (clean(data.basics.fullName)) push(clean(data.basics.fullName));

  return out;
}

/**
 * The cover letter as plain text, for an application form that wants the
 * letter pasted into a box. Opens on the letterhead, because on its own it has
 * to say who sent it.
 */
export function buildCoverLetterText(data: ResumeData): string {
  const out: string[] = [];
  if (clean(data.basics.fullName)) out.push(clean(data.basics.fullName).toUpperCase());
  if (clean(data.basics.title)) out.push(clean(data.basics.title));
  const contact = contactLine(data);
  if (contact) out.push(contact);
  out.push(...letterLines(data));
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/* ===========================================================================
   Delivery
   =========================================================================== */

/** A filename that survives every filesystem the download might land on. */
export function exportFilename(data: ResumeData, extension: string, suffix = 'Resume'): string {
  const name = clean(data.basics.fullName).replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  return `${name ? `${name}-` : ''}${suffix}.${extension}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: Safari has not finished with the URL at the
  // moment click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Puts text on the clipboard. The async API needs a secure context and can be
 * refused outright, so a hidden textarea and execCommand stay as the fallback.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the older path.
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

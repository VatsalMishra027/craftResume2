import { fitSheet, observeSheets } from '../lib/fit';
import { parsePdfResume, stripLeadingBullet } from '../lib/pdf';
import type { ExtractedSectionItem, ItemCategory, ParsedResumeResult, UnmappedSection } from '../lib/pdf/types';
import { renderResume, sheetClass, sheetStyle } from '../lib/render';
import { loadAccent, loadFont, loadFontSize, saveResume, saveTemplate, uid } from '../lib/store';
import { DEFAULT_TEMPLATE, TEMPLATES } from '../lib/templates';
import type { CustomSection, ResumeData, SectionKey } from '../lib/types';

export function initImportWizard(): void {
  const uploadStep = document.querySelector<HTMLElement>('[data-step="upload"]');
  const reviewStep = document.querySelector<HTMLElement>('[data-step="review"]');
  const templateStep = document.querySelector<HTMLElement>('[data-step="template"]');

  const dropZone = document.querySelector<HTMLElement>('[data-drop-zone]');
  const fileInput = document.querySelector<HTMLInputElement>('[data-file-input]');
  const progressBox = document.querySelector<HTMLElement>('[data-upload-progress]');
  const progressText = document.querySelector<HTMLElement>('[data-progress-text]');

  const stepPills = document.querySelectorAll<HTMLElement>('[data-step-pill]');

  if (!uploadStep || !reviewStep || !templateStep || !dropZone || !fileInput) return;

  let parsed: ParsedResumeResult | null = null;
  let selectedTemplate: string = DEFAULT_TEMPLATE;
  let unobserveCards: (() => void) | null = null;

  function refitTemplates(): void {
    const grid = document.querySelector<HTMLElement>('[data-template-cards]');
    if (!grid) return;
    grid.querySelectorAll<HTMLElement>('[data-sheet-fit]').forEach(fitSheet);
  }

  function setStep(step: 'upload' | 'review' | 'template'): void {
    uploadStep?.classList.toggle('hidden', step !== 'upload');
    reviewStep?.classList.toggle('hidden', step !== 'review');
    templateStep?.classList.toggle('hidden', step !== 'template');

    stepPills.forEach((pill) => {
      const active = pill.dataset.stepPill === step;
      pill.setAttribute('aria-current', String(active));
      pill.classList.toggle('bg-ink', active);
      pill.classList.toggle('text-paper', active);
      pill.classList.toggle('bg-surface', !active);
      pill.classList.toggle('text-ink-muted', !active);
    });

    if (step === 'template') {
      requestAnimationFrame(() => {
        refitTemplates();
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Drag & drop listeners
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('border-ink', 'bg-paper-sunk');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-ink', 'bg-paper-sunk');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      void handleFile(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      void handleFile(fileInput.files[0]);
    }
  });

  async function handleFile(file: File): Promise<void> {
    console.log('====================================================');
    console.log('[PDF Import] User file selected:');
    console.log(`  • Uploaded filename: ${file.name}`);
    console.log(`  • File size: ${file.size} bytes (${(file.size / 1024).toFixed(1)} KB)`);
    console.log(`  • MIME type: ${file.type || '(empty/unknown)'}`);

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file (.pdf).');
      return;
    }

    try {
      progressBox?.classList.remove('hidden');
      if (progressText) progressText.textContent = 'Reading PDF binary data…';

      const arrayBuffer = await file.arrayBuffer();
      console.log(`  • ArrayBuffer byte length: ${arrayBuffer.byteLength} bytes`);

      if (progressText) progressText.textContent = 'Stage 1: Reconstructing PDF geometry & text columns…';

      // Parse resume through 2-stage pipeline
      parsed = await parsePdfResume(arrayBuffer, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      console.log('[PDF Import] Resume parsed successfully! Summary stats:', parsed.stats);

      if (progressText) progressText.textContent = 'Stage 2: Classifying sections & evaluating confidence…';
      await new Promise((r) => setTimeout(r, 350));

      renderReview();
      setStep('review');
    } catch (err: unknown) {
      console.error('[PDF Import Pipeline Failure] Exception caught:', err);
      if (err instanceof Error && err.stack) {
        console.error('[PDF Import Pipeline Failure] Stack trace:', err.stack);
      }
      const msg = err instanceof Error ? err.message : String(err);
      alert(
        `Could not extract text from this PDF.\n\nDetails: ${msg}\n\nCheck browser developer console (F12) for the complete diagnostic trace.`,
      );
    } finally {
      progressBox?.classList.add('hidden');
    }
  }

  function syncCustomSectionsToData(result: ParsedResumeResult): void {
    const customSections: CustomSection[] = [];

    for (const u of result.unmappedSections) {
      const keptItems = u.items.filter(
        (it) => it.assignedCategory === 'custom' || !it.assignedCategory,
      );

      if (keptItems.length > 0) {
        customSections.push({
          id: u.id || uid('csec'),
          title: u.rawHeading || 'Custom Section',
          type: 'custom',
          items: keptItems.map((it) => {
            const rawText = it.text || [it.name, it.detail].filter(Boolean).join(' — ');
            const cleanText = stripLeadingBullet(rawText);
            const cleanName = stripLeadingBullet(it.name || '');
            return {
              id: it.id,
              text: cleanText || rawText,
              name: cleanName || it.name,
              detail: it.detail,
              date: it.date,
              url: it.url,
            };
          }),
        });
      }
    }

    result.data.customSections = customSections;

    if (result.data.order && result.data.order.length > 0) {
      const existing = new Set(result.data.order);
      for (const cs of customSections) {
        if (!existing.has(cs.id)) {
          result.data.order.push(cs.id);
        }
      }
    }
  }

  function renderReview(): void {
    if (!parsed) return;
    syncCustomSectionsToData(parsed);
    const { data, confidence, unmappedSections, stats } = parsed;

    // 1. Stats Bar
    renderStatsBar(parsed);

    // 2. Section Health Checklist
    renderChecklist(parsed);

    // 3. Basics fields
    bindInput('basics.fullName', data.basics.fullName, confidence['basics.fullName']);
    bindInput('basics.title', data.basics.title, confidence['basics.title']);
    bindInput('basics.email', data.basics.email, confidence['basics.email']);
    bindInput('basics.phone', data.basics.phone, confidence['basics.phone']);
    bindInput('basics.location', data.basics.location, confidence['basics.location']);
    bindInput('basics.website', data.basics.website, confidence['basics.website']);
    bindInput('basics.linkedin', data.basics.linkedin, confidence['basics.linkedin']);
    bindInput('basics.github', data.basics.github, confidence['basics.github']);
    bindInput('basics.summary', data.basics.summary, confidence['basics.summary'], true);

    // 4. Experience, Education, Skills, Projects, Certifications, Unmapped
    renderExperienceCards(data);
    renderEducationCards(data);
    renderSkillPills(data);
    renderProjectCards(data);
    renderCertificationsCards(data);
    renderUnmappedSections(unmappedSections);
  }

  function renderStatsBar(result: ParsedResumeResult): void {
    const statsEl = document.querySelector<HTMLElement>('[data-review-stats]');
    if (!statsEl) return;
    const { data, unmappedSections, stats } = result;

    statsEl.innerHTML = `
      <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
        <strong>${stats.pagesCount}</strong> ${stats.pagesCount === 1 ? 'Page' : 'Pages'}
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
        <strong>${data.experience.length}</strong> Roles
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
        <strong>${data.education.length}</strong> Degrees
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
        <strong>${data.skills.length}</strong> Skills
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
        <strong>${data.projects.length}</strong> Projects
      </span>
      ${
        data.certifications && data.certifications.length > 0
          ? `<span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
              <strong>${data.certifications.length}</strong> Certifications
            </span>`
          : ''
      }
      ${
        unmappedSections.length > 0
          ? `<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
              <strong>${unmappedSections.reduce((acc, u) => acc + (u.itemCount || 1), 0)}</strong> Custom Items (${unmappedSections.length} Sections)
            </span>`
          : ''
      }
    `;
  }

  function renderChecklist(result: ParsedResumeResult): void {
    const checklistEl = document.querySelector<HTMLElement>('[data-review-checklist]');
    if (!checklistEl) return;

    const items = [
      {
        label: 'Personal Information',
        ok: !!result.data.basics.fullName && !!result.data.basics.email,
        sub: result.data.basics.fullName ? result.data.basics.fullName : 'Name missing',
      },
      {
        label: 'Experience',
        ok: result.data.experience.length > 0,
        sub: `${result.data.experience.length} roles detected`,
      },
      {
        label: 'Education',
        ok: result.data.education.length > 0,
        sub: `${result.data.education.length} degrees detected`,
      },
      {
        label: 'Skills',
        ok: result.data.skills.length >= 3,
        sub: `${result.data.skills.length} skills detected`,
      },
      {
        label: 'Projects',
        ok: result.data.projects.length > 0,
        sub: `${result.data.projects.length} projects`,
      },
    ];

    if (result.data.certifications && result.data.certifications.length > 0) {
      items.push({
        label: 'Certifications',
        ok: true,
        sub: `${result.data.certifications.length} certificates`,
      });
    }

    if (result.unmappedSections.length > 0) {
      const totalCustomItems = result.unmappedSections.reduce((acc, u) => acc + (u.itemCount || 1), 0);
      items.push({
        label: 'Custom Sections',
        ok: true,
        sub: `${totalCustomItems} items preserved`,
      });
    }

    checklistEl.innerHTML = `
      <span class="text-xs font-semibold text-ink-soft mr-2 flex-none">Section Health:</span>
      ${items
        .map(
          (item) => `
        <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          item.ok
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
        }">
          <span class="font-bold">${item.ok ? '✓' : '⚠'}</span>
          <span>${item.label}</span>
          <span class="opacity-70 text-[10px]">(${item.sub})</span>
        </span>
      `,
        )
        .join('')}
    `;
  }

  function renderExperienceCards(data: ResumeData): void {
    const expList = document.querySelector<HTMLElement>('[data-review-experience]');
    if (!expList) return;

    if (!data.experience.length) {
      expList.innerHTML = `<p class="text-xs text-ink-faint italic py-2">No experience entries detected.</p>`;
      return;
    }

    expList.innerHTML = data.experience
      .map(
        (exp) => `
      <div class="rounded-card border border-line bg-surface p-4 transition-all duration-200">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h4 class="font-semibold text-sm text-ink">${esc(exp.role || 'Role')}</h4>
          <span class="text-xs text-ink-muted">${esc(exp.start)}${exp.end ? ` — ${esc(exp.end)}` : ''}</span>
        </div>
        <p class="text-xs font-medium text-clay mt-0.5">${esc(exp.company)}${exp.location ? ` · ${esc(exp.location)}` : ''}</p>
        ${
          exp.bullets
            ? `<ul class="mt-2.5 space-y-1 pl-4 list-disc text-xs text-ink-soft leading-relaxed">
              ${exp.bullets
                .split('\n')
                .map((b) => `<li>${esc(b)}</li>`)
                .join('')}
            </ul>`
            : ''
        }
      </div>`,
      )
      .join('');
  }

  function renderEducationCards(data: ResumeData): void {
    const eduList = document.querySelector<HTMLElement>('[data-review-education]');
    if (!eduList) return;

    if (!data.education.length) {
      eduList.innerHTML = `<p class="text-xs text-ink-faint italic py-2">No education entries detected.</p>`;
      return;
    }

    eduList.innerHTML = data.education
      .map(
        (edu) => `
      <div class="rounded-card border border-line bg-surface p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h4 class="font-semibold text-sm text-ink">${esc(edu.degree)}</h4>
          <span class="text-xs text-ink-muted">${esc(edu.start)}${edu.end ? ` — ${esc(edu.end)}` : ''}</span>
        </div>
        <p class="text-xs font-medium text-clay mt-0.5">${esc(edu.school)}</p>
        ${edu.note ? `<p class="text-xs text-ink-faint mt-1">${esc(edu.note)}</p>` : ''}
      </div>`,
      )
      .join('');
  }

  function renderSkillPills(data: ResumeData): void {
    const skillsList = document.querySelector<HTMLElement>('[data-review-skills]');
    if (!skillsList) return;

    if (!data.skills.length) {
      skillsList.innerHTML = `<p class="text-xs text-ink-faint italic py-2">No skills detected.</p>`;
      return;
    }

    skillsList.innerHTML = data.skills
      .map(
        (s) =>
          `<span class="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink font-medium">${esc(s.name)}</span>`,
      )
      .join('');
  }

  function renderProjectCards(data: ResumeData): void {
    const prjList = document.querySelector<HTMLElement>('[data-review-projects]');
    if (!prjList) return;

    if (!data.projects.length) {
      prjList.innerHTML = `<p class="text-xs text-ink-faint italic py-2">No projects detected.</p>`;
      return;
    }

    prjList.innerHTML = data.projects
      .map((p) => {
        const bulletList = p.description
          ? p.description
              .split('\n')
              .map((b) => b.trim())
              .filter(Boolean)
          : [];

        const bulletsHtml =
          bulletList.length > 0
            ? `<ul class="mt-2 space-y-1 text-xs text-ink-soft">
                ${bulletList
                  .map(
                    (b) => `
                  <li class="flex items-start gap-2">
                    <span class="text-ink-muted select-none leading-relaxed">•</span>
                    <span class="leading-relaxed">${esc(b)}</span>
                  </li>`,
                  )
                  .join('')}
              </ul>`
            : '';

        return `
      <div class="rounded-card border border-line bg-surface p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h4 class="font-semibold text-sm text-ink">${esc(p.name)}</h4>
          ${p.link ? `<span class="text-xs text-clay underline">${esc(p.link)}</span>` : ''}
        </div>
        ${p.tech ? `<p class="text-xs font-mono text-clay-deep dark:text-clay mt-0.5">${esc(p.tech)}</p>` : ''}
        ${bulletsHtml}
      </div>`;
      })
      .join('');
  }

  function renderCertificationsCards(data: ResumeData): void {
    const container = document.querySelector<HTMLElement>('[data-review-certifications-container]');
    const certList = document.querySelector<HTMLElement>('[data-review-certifications]');
    if (!container || !certList) return;

    if (!data.certifications || !data.certifications.length) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    certList.innerHTML = data.certifications
      .map(
        (c) => `
      <div class="rounded-card border border-line bg-surface p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h4 class="font-semibold text-sm text-ink">${esc(c.name)}</h4>
          ${c.date ? `<span class="text-xs text-ink-muted">${esc(c.date)}</span>` : ''}
        </div>
        ${c.issuer ? `<p class="text-xs font-medium text-clay mt-0.5">${esc(c.issuer)}</p>` : ''}
      </div>`,
      )
      .join('');
  }

  function renderUnmappedSections(unmapped: UnmappedSection[]): void {
    const container = document.querySelector<HTMLElement>('[data-review-unmapped-container]');
    const list = document.querySelector<HTMLElement>('[data-review-unmapped]');
    if (!container || !list) return;

    if (!unmapped.length) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    list.innerHTML = unmapped
      .map((u) => {
        const firstItem = u.items && u.items.length > 0 ? u.items[0] : null;
        const previewText = firstItem ? firstItem.text : u.content.split('\n')[0] || '';

        return `
      <div class="rounded-card border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 transition-all" data-section-card="${u.id}">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="size-2.5 rounded-full bg-amber-500"></span>
            <h4 class="font-semibold text-sm text-ink">
              Detected: <strong>"${esc(u.rawHeading)}"</strong>
            </h4>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              ${u.itemCount} items detected
            </span>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-ink-muted font-medium">Batch destination:</label>
            <select
              data-reassign-batch="${u.id}"
              class="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-ink cursor-pointer"
            >
              <option value="">Place all in...</option>
              <option value="custom">Keep all as Custom</option>
              <option value="certifications">All to Certifications</option>
              <option value="experience">All to Work Experience</option>
              <option value="projects">All to Projects</option>
              <option value="publications">All to Publications</option>
            </select>
          </div>
        </div>

        <!-- Shortened Preview -->
        <div class="mt-3 p-3 rounded-lg bg-surface/80 border border-line/60">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Preview</span>
            <button
              type="button"
              data-toggle-items="${u.id}"
              class="text-xs font-semibold text-clay hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              [View / Edit all ${u.itemCount} items]
            </button>
          </div>
          <p class="text-xs text-ink-muted leading-relaxed line-clamp-2">${esc(previewText)}</p>
        </div>

        <!-- Interactive Per-Item Classification & Placement -->
        <div class="mt-4 space-y-2.5" data-items-container="${u.id}">
          <div class="flex items-center justify-between border-b border-line/40 pb-1.5">
            <span class="text-xs font-semibold text-ink">Detected Items & Destinations:</span>
            <span class="text-[11px] text-ink-muted">Assign each item independently</span>
          </div>

          <div class="space-y-2">
            ${u.items.map((it, idx) => `
              <div class="rounded-lg border border-line/70 bg-surface p-3 transition-all hover:border-line-strong">
                <div class="flex flex-wrap items-start justify-between gap-2.5">
                  <div class="flex items-start gap-2.5 flex-1 min-w-[220px]">
                    <span class="text-xs font-bold text-ink-muted mt-0.5">${idx + 1}.</span>
                    <div class="space-y-0.5">
                      <div class="text-xs font-semibold text-ink">${esc(it.name)}</div>
                      ${it.detail ? `<div class="text-[11px] text-ink-muted leading-relaxed">${esc(it.detail)}</div>` : ''}
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-none">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                      Suggested: ${esc(it.suggestedCategoryLabel || it.suggestedCategory || 'Achievements')}
                    </span>
                    <select
                      data-item-reassign="${u.id}:${it.id}"
                      class="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none focus:border-ink cursor-pointer"
                    >
                      <option value="custom" ${it.assignedCategory === 'custom' || !it.assignedCategory ? 'selected' : ''}>Keep as Custom</option>
                      <option value="certifications" ${it.assignedCategory === 'certifications' ? 'selected' : ''}>Certifications</option>
                      <option value="experience" ${it.assignedCategory === 'experience' ? 'selected' : ''}>Work Experience</option>
                      <option value="projects" ${it.assignedCategory === 'projects' ? 'selected' : ''}>Projects</option>
                      <option value="publications" ${it.assignedCategory === 'publications' ? 'selected' : ''}>Publications</option>
                    </select>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Raw Text View Toggle -->
        <div class="mt-3 pt-2 border-t border-line/30 flex items-center justify-between">
          <button
            type="button"
            data-toggle-raw="${u.id}"
            class="text-[11px] font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            Show raw section text
          </button>
        </div>
        <div class="mt-2 hidden" data-raw-drawer="${u.id}">
          <textarea
            data-raw-textarea="${u.id}"
            rows="5"
            class="w-full rounded-lg border border-line bg-surface p-2 text-xs font-mono text-ink leading-relaxed focus:outline-none focus:border-ink"
          >${esc(u.content)}</textarea>
        </div>
      </div>
        `;
      })
      .join('');

    attachUnmappedSectionListeners(list);
  }

  function attachUnmappedSectionListeners(list: HTMLElement): void {
    // 1. Toggle Items Visibility
    list.querySelectorAll<HTMLButtonElement>('[data-toggle-items]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const uId = btn.dataset.toggleItems!;
        const container = list.querySelector<HTMLElement>(`[data-items-container="${uId}"]`);
        if (container) {
          container.classList.toggle('hidden');
          btn.textContent = container.classList.contains('hidden')
            ? `[View all items]`
            : `[Collapse items]`;
        }
      });
    });

    // 2. Toggle Raw Textarea
    list.querySelectorAll<HTMLButtonElement>('[data-toggle-raw]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const uId = btn.dataset.toggleRaw!;
        const drawer = list.querySelector<HTMLElement>(`[data-raw-drawer="${uId}"]`);
        if (drawer) {
          drawer.classList.toggle('hidden');
          btn.textContent = drawer.classList.contains('hidden')
            ? 'Show raw section text'
            : 'Hide raw section text';
        }
      });
    });

    // 3. Raw Textarea Edits
    list.querySelectorAll<HTMLTextAreaElement>('[data-raw-textarea]').forEach((ta) => {
      ta.addEventListener('input', () => {
        if (!parsed) return;
        const uId = ta.dataset.rawTextarea!;
        const item = parsed.unmappedSections.find((u) => u.id === uId);
        if (item) {
          item.content = ta.value;
          syncCustomSectionsToData(parsed);
        }
      });
    });

    // 4. Individual Item Reassign
    list.querySelectorAll<HTMLSelectElement>('[data-item-reassign]').forEach((select) => {
      select.addEventListener('change', () => {
        const [uId, itId] = select.dataset.itemReassign!.split(':');
        const target = select.value as ItemCategory;
        handleReassignItem(uId, itId, target);
      });
    });

    // 5. Batch Reassign for Entire Section
    list.querySelectorAll<HTMLSelectElement>('[data-reassign-batch]').forEach((select) => {
      select.addEventListener('change', () => {
        const uId = select.dataset.reassignBatch!;
        const target = select.value as ItemCategory;
        if (!target) return;
        handleBatchReassignSection(uId, target);
      });
    });
  }

  function handleReassignItem(uId: string, itId: string, targetCategory: ItemCategory): void {
    if (!parsed) return;
    const section = parsed.unmappedSections.find((u) => u.id === uId);
    if (!section) return;
    const item = section.items.find((it) => it.id === itId);
    if (!item) return;

    item.assignedCategory = targetCategory;

    // Clean up any existing instances of this item across standard arrays
    parsed.data.certifications = parsed.data.certifications.filter((c) => c.id !== itId);
    parsed.data.experience = parsed.data.experience.filter((e) => e.id !== itId);
    parsed.data.projects = parsed.data.projects.filter((p) => p.id !== itId);
    parsed.data.publications = parsed.data.publications.filter((p) => p.id !== itId);

    // Place into target destination if not kept as custom
    if (targetCategory === 'certifications') {
      parsed.data.certifications.push({
        id: itId,
        name: stripLeadingBullet(item.name || item.text),
        issuer: item.detail || section.rawHeading,
        date: item.date || '',
      });
    } else if (targetCategory === 'experience') {
      parsed.data.experience.push({
        id: itId,
        role: stripLeadingBullet(item.name),
        company: section.rawHeading,
        location: '',
        start: item.date || '',
        end: '',
        bullets: stripLeadingBullet(item.detail || item.text),
      });
    } else if (targetCategory === 'projects') {
      parsed.data.projects.push({
        id: itId,
        name: stripLeadingBullet(item.name),
        link: item.url || '',
        tech: '',
        description: stripLeadingBullet(item.detail || item.text),
      });
    } else if (targetCategory === 'publications') {
      parsed.data.publications.push({
        id: itId,
        title: stripLeadingBullet(item.name),
        meta: item.detail || item.text,
      });
    }

    // Re-render affected standard sections
    syncCustomSectionsToData(parsed);
    renderCertificationsCards(parsed.data);
    renderExperienceCards(parsed.data);
    renderProjectCards(parsed.data);
    renderChecklist(parsed);
    renderStatsBar(parsed);
  }

  function handleBatchReassignSection(uId: string, targetCategory: ItemCategory): void {
    if (!parsed) return;
    const section = parsed.unmappedSections.find((u) => u.id === uId);
    if (!section) return;

    section.items.forEach((it) => {
      handleReassignItem(uId, it.id, targetCategory);
    });

    // Update select dropdowns in DOM
    const list = document.querySelector<HTMLElement>('[data-review-unmapped]');
    if (list) {
      section.items.forEach((it) => {
        const sel = list.querySelector<HTMLSelectElement>(`[data-item-reassign="${uId}:${it.id}"]`);
        if (sel) sel.value = targetCategory;
      });
    }
  }

  function bindInput(
    fieldKey: string,
    val: string,
    confidenceStatus?: string,
    isTextarea = false,
  ): void {
    const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[data-field="${fieldKey}"]`,
    );
    const badge = document.querySelector<HTMLElement>(`[data-confidence="${fieldKey}"]`);

    if (input) {
      input.value = val || '';
      input.oninput = () => {
        if (!parsed) return;
        const keys = fieldKey.split('.');
        if (keys[0] === 'basics' && keys[1]) {
          (parsed.data.basics as Record<string, string>)[keys[1]] = input.value;
        }
      };
    }

    if (badge) {
      if (confidenceStatus === 'low' && !val) {
        badge.innerHTML = `<span class="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">⚠️ Empty</span>`;
      } else if (confidenceStatus === 'low') {
        badge.innerHTML = `<span class="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">⚠️ Please verify</span>`;
      } else {
        badge.innerHTML = '';
      }
    }
  }

  window.addEventListener('resize', () => {
    if (templateStep && !templateStep.classList.contains('hidden')) {
      refitTemplates();
    }
  });

  // Navigation between steps
  document.querySelectorAll<HTMLElement>('[data-action="to-template"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (parsed) syncCustomSectionsToData(parsed);
      setStep('template');
      renderTemplateCards();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="to-review"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setStep('review');
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="reupload"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
      setStep('upload');
    });
  });

  function renderTemplateCards(): void {
    if (!parsed) return;
    const grid = document.querySelector<HTMLElement>('[data-template-cards]');
    if (!grid) return;

    if (unobserveCards) {
      unobserveCards();
      unobserveCards = null;
    }

    const style = sheetStyle(loadAccent(), { font: loadFont(), size: loadFontSize() });

    grid.innerHTML = TEMPLATES.map((t) => {
      const isSelected = t.id === selectedTemplate;
      const html = renderResume(parsed!.data, t.id, { links: false });

      return `
        <article class="template-choice group cursor-pointer" data-template-id="${t.id}">
          <div class="template-card-box relative overflow-hidden rounded-card border-2 transition-all duration-200 ${
            isSelected ? 'border-clay shadow-lift ring-2 ring-clay/20' : 'border-line hover:border-line-strong'
          }">
            <div class="sheet-fit sheet-fit--page pointer-events-none bg-white" data-sheet-fit="page" aria-hidden="true">
              <div class="${sheetClass(t.id)}" style="${style}">
                ${html}
              </div>
            </div>
            <div data-check-badge class="absolute top-2.5 right-2.5 z-10 rounded-full bg-clay text-white p-1 shadow-sm ${
              isSelected ? '' : 'hidden'
            }">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" class="size-3.5"><path d="m3 8 3.5 3.5L13 5"/></svg>
            </div>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <h3 class="font-semibold text-sm text-ink">${t.name}</h3>
            <span class="text-[11px] text-ink-muted">${t.category}</span>
          </div>
          <p class="text-xs text-ink-soft mt-0.5 line-clamp-1">${t.tagline}</p>
        </article>
      `;
    }).join('');

    unobserveCards = observeSheets(grid);
    requestAnimationFrame(() => {
      refitTemplates();
    });

    grid.querySelectorAll<HTMLElement>('[data-template-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.templateId!;
        selectedTemplate = id;
        grid.querySelectorAll<HTMLElement>('[data-template-id]').forEach((c) => {
          const isCurrent = c.dataset.templateId === selectedTemplate;
          const box = c.querySelector<HTMLElement>('.template-card-box');
          const badge = c.querySelector<HTMLElement>('[data-check-badge]');
          if (box) {
            box.className = `template-card-box relative overflow-hidden rounded-card border-2 transition-all duration-200 ${
              isCurrent ? 'border-clay shadow-lift ring-2 ring-clay/20' : 'border-line hover:border-line-strong'
            }`;
          }
          if (badge) {
            badge.classList.toggle('hidden', !isCurrent);
          }
        });
      });
    });
  }

  // Final Action: Launch Editor
  document.querySelector<HTMLElement>('[data-action="launch-editor"]')?.addEventListener('click', () => {
    if (!parsed) return;
    syncCustomSectionsToData(parsed);
    saveResume(parsed.data);
    saveTemplate(selectedTemplate);
    window.location.href = `/editor?template=${selectedTemplate}`;
  });
}

function esc(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

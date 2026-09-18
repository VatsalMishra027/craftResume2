import { parsePdfResume } from '../lib/pdf';
import type { ParsedResumeResult, UnmappedSection } from '../lib/pdf/types';
import type { ResumeData, SectionKey } from '../lib/types';
import { saveResume, saveTemplate, uid } from '../lib/store';
import { DEFAULT_TEMPLATE, TEMPLATES } from '../lib/templates';
import { renderResume, sheetStyle } from '../lib/render';

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

  function renderReview(): void {
    if (!parsed) return;
    const { data, confidence, unmappedSections, stats } = parsed;

    // 1. Stats Bar
    const statsEl = document.querySelector<HTMLElement>('[data-review-stats]');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
          <strong>${stats.pagesCount}</strong> ${stats.pagesCount === 1 ? 'Page' : 'Pages'}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
          <strong>${stats.experienceCount}</strong> Roles
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
          <strong>${stats.educationCount}</strong> Degrees
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
          <strong>${stats.skillsCount}</strong> Skills
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line text-xs font-medium text-ink">
          <strong>${stats.projectsCount}</strong> Projects
        </span>
        ${
          unmappedSections.length > 0
            ? `<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                <strong>${unmappedSections.length}</strong> Custom / Preserved
              </span>`
            : ''
        }
      `;
    }

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

    // 4. Experience, Education, Skills, Projects, Unmapped
    renderExperienceCards(data);
    renderEducationCards(data);
    renderSkillPills(data);
    renderProjectCards(data);
    renderUnmappedSections(unmappedSections);
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

    if (result.unmappedSections.length > 0) {
      items.push({
        label: 'Custom Sections',
        ok: false,
        sub: `${result.unmappedSections.length} to review`,
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
          bulletList.length > 1
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
            : bulletList.length === 1
              ? `<p class="text-xs text-ink-soft mt-1.5 leading-relaxed">${esc(bulletList[0])}</p>`
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
      .map(
        (u) => `
      <div class="rounded-card border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h4 class="font-medium text-sm text-ink flex items-center gap-2">
            <span class="size-2 rounded-full bg-amber-500"></span>
            Detected: <strong>"${esc(u.rawHeading)}"</strong>
          </h4>
          <div class="flex items-center gap-2">
            <label class="text-xs text-ink-muted">Place in:</label>
            <select
              data-reassign="${u.id}"
              class="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-ink"
            >
              <option value="custom" ${!u.suggestedCategory ? 'selected' : ''}>Keep as Custom</option>
              <option value="certifications" ${u.suggestedCategory === 'certifications' ? 'selected' : ''}>Certifications</option>
              <option value="experience" ${u.suggestedCategory === 'experience' ? 'selected' : ''}>Work Experience</option>
              <option value="projects" ${u.suggestedCategory === 'projects' ? 'selected' : ''}>Projects</option>
              <option value="publications" ${u.suggestedCategory === 'publications' ? 'selected' : ''}>Publications</option>
            </select>
          </div>
        </div>
        <p class="mt-2 text-xs text-ink-muted line-clamp-3 leading-relaxed whitespace-pre-wrap">${esc(u.content)}</p>
      </div>`,
      )
      .join('');

    // Reassignment listeners
    list.querySelectorAll<HTMLSelectElement>('[data-reassign]').forEach((select) => {
      select.addEventListener('change', () => {
        const id = select.dataset.reassign;
        const target = select.value;
        handleReassignSection(id!, target);
      });
    });
  }

  function handleReassignSection(unmappedId: string, targetSection: string): void {
    if (!parsed) return;
    const item = parsed.unmappedSections.find((u) => u.id === unmappedId);
    if (!item) return;

    if (targetSection === 'experience') {
      parsed.data.experience.push({
        id: uid('exp'),
        role: item.rawHeading,
        company: '',
        location: '',
        start: '',
        end: '',
        bullets: item.content,
      });
    } else if (targetSection === 'projects') {
      parsed.data.projects.push({
        id: uid('prj'),
        name: item.rawHeading,
        link: '',
        tech: '',
        description: item.content,
      });
    } else if (targetSection === 'certifications') {
      parsed.data.certifications.push({
        id: uid('crt'),
        name: item.rawHeading,
        issuer: '',
        date: '',
      });
    } else if (targetSection === 'publications') {
      parsed.data.publications.push({
        id: uid('pub'),
        title: item.rawHeading,
        meta: item.content.slice(0, 80),
      });
    }

    renderExperienceCards(parsed.data);
    renderEducationCards(parsed.data);
    renderProjectCards(parsed.data);
    renderChecklist(parsed);
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

  // Navigation between steps
  document.querySelector<HTMLElement>('[data-action="to-template"]')?.addEventListener('click', () => {
    renderTemplateCards();
    setStep('template');
  });

  document.querySelector<HTMLElement>('[data-action="to-review"]')?.addEventListener('click', () => {
    setStep('review');
  });

  document.querySelector<HTMLElement>('[data-action="reupload"]')?.addEventListener('click', () => {
    if (fileInput) fileInput.value = '';
    setStep('upload');
  });

  function renderTemplateCards(): void {
    if (!parsed) return;
    const grid = document.querySelector<HTMLElement>('[data-template-cards]');
    if (!grid) return;

    grid.innerHTML = TEMPLATES.map((t) => {
      const isSelected = t.id === selectedTemplate;
      const html = renderResume(parsed!.data, t.id);
      const style = sheetStyle('navy', { font: 'default', size: 's' });

      return `
        <article class="template-choice group cursor-pointer" data-template-id="${t.id}">
          <div class="relative overflow-hidden rounded-card border-2 transition-all duration-200 ${
            isSelected ? 'border-clay shadow-lift ring-2 ring-clay/20' : 'border-line hover:border-line-strong'
          }">
            <div class="aspect-[210/297] w-full overflow-hidden bg-white">
              <div class="pointer-events-none origin-top-left scale-[0.38] sm:scale-[0.42] w-[794px] h-[1123px]">
                <div class="${t.layout === 'sidebar' ? 't-atlas' : `t-${t.id}`}" style="${style}">
                  ${html}
                </div>
              </div>
            </div>
            ${
              isSelected
                ? `<div class="absolute top-2 right-2 rounded-full bg-clay text-white p-1 shadow-sm">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" class="size-3.5"><path d="m3 8 3.5 3.5L13 5"/></svg>
                  </div>`
                : ''
            }
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <h3 class="font-semibold text-sm text-ink">${t.name}</h3>
            <span class="text-[11px] text-ink-muted">${t.category}</span>
          </div>
          <p class="text-xs text-ink-soft mt-0.5 line-clamp-1">${t.tagline}</p>
        </article>
      `;
    }).join('');

    grid.querySelectorAll<HTMLElement>('[data-template-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.templateId!;
        selectedTemplate = id;
        renderTemplateCards();
      });
    });
  }

  // Final Action: Launch Editor
  document.querySelector<HTMLElement>('[data-action="launch-editor"]')?.addEventListener('click', () => {
    if (!parsed) return;
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

# CraftResume

A free resume builder. Pick a template, fill in your details, download a clean A4 PDF.
No account, no watermark, nothing uploaded to a server.

Built with [Astro](https://astro.build) and [Tailwind CSS v4](https://tailwindcss.com).

## Scope

This is deliberately one product loop and nothing else:

1. **Choose a template** — four layouts (Onyx, Meridian, Quill, Grid).
2. **Edit your details** — a form on the left, the real A4 page on the right, updating as you type.
3. **Download** — the print path isolates the sheet at true A4 size, so "Save as PDF" produces
   selectable text rather than a screenshot.

Cover letters, multiple saved versions, AI writing and accounts are all out of scope for now.

## Running it

```bash
npm install
npm run dev
```

The project's agent instructions prefer background mode for the dev server:

```bash
npx astro dev --background
```

Manage it with `astro dev stop`, `astro dev status` and `astro dev logs`.

| Command           | Does                                     |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Dev server on `localhost:4321`           |
| `npm run build`   | Static build into `dist/`                |
| `npm run preview` | Serve the build locally                  |

## How it fits together

```
src/
  lib/
    types.ts       Resume data model
    templates.ts   Template registry (id, name, who it suits)
    sample.ts      Prefilled + empty resume shapes
    render.ts      ResumeData -> resume sheet HTML (escapes all user input)
    store.ts       localStorage load/save, with shape normalisation on read
    fit.ts         Scales a true-size A4 sheet to fit its container
  scripts/
    editor.ts      Editor wiring: form <-> state <-> live preview <-> print
  styles/
    global.css     Tailwind import, @theme design tokens, print rules
    resume.css     The four templates, in mm/pt so screen and paper match
  components/      Site chrome, template cards, form field
  pages/           index (landing), templates (gallery), editor
```

Two ideas hold the whole thing up:

- **One renderer.** `renderResume()` produces the marketing thumbnails, the live preview and the
  printed page. There is no separate "export" code path that can drift from what you saw.
- **Real A4, scaled.** The sheet is always `210mm × 297mm`; only a CSS transform changes, so the
  preview and the PDF are the same document at different zoom levels.

### Design tokens

The palette is warm paper, near-black ink, and a single clay accent used sparingly. All of it lives
in the `@theme` block at the top of `src/styles/global.css` — change it there and the whole site
follows.

## Privacy

Resume content is written to `localStorage` under `craftresume:data:v1` and never leaves the
browser. There is no backend.

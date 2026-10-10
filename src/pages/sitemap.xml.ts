import type { APIRoute } from 'astro';

/**
 * A hand-listed sitemap: the site is a handful of static pages, so a list is
 * clearer than a plugin. Add a page here when one is added under src/pages.
 */
const PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/templates', priority: '0.9', changefreq: 'weekly' },
  { path: '/editor', priority: '0.8', changefreq: 'monthly' },
  { path: '/cover-letter-templates', priority: '0.7', changefreq: 'monthly' },
  { path: '/cover-letter', priority: '0.6', changefreq: 'monthly' },
  { path: '/import', priority: '0.6', changefreq: 'monthly' },
];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://freeresumemakerai.com');
  const urls = PAGES.map(
    (p) =>
      `  <url>\n    <loc>${new URL(p.path, base).href}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
  ).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

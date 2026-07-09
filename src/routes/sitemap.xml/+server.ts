import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { catalogTree } from '$lib/server/categories';
import { slugify } from '$lib/utils/slugify';
import { SITE_URL } from '$lib/config/site';

const xml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

type UrlEntry = {
  loc: string;
  lastmod?: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: number;
};

export const GET: RequestHandler = async () => {
  const today = new Date().toISOString().split('T')[0];
  const entries: UrlEntry[] = [];

  // 1. Статичные страницы
  const staticPages = [
    { path: '/', priority: 1.0 },
    { path: '/catalog', priority: 0.9 },
    { path: '/about', priority: 0.5 },
    { path: '/contacts', priority: 0.5 },
    { path: '/delivery', priority: 0.5 },
    { path: '/favorites', priority: 0.3 }
  ];
  for (const p of staticPages) {
    entries.push({
      loc: `${SITE_URL}${p.path}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: p.priority
    });
  }

  // 2. Категории каталога: root → group → leaf
  for (const root of catalogTree) {
    // root: /catalog/{root}
    entries.push({
      loc: `${SITE_URL}/catalog/${root.slug}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: 0.9
    });

    for (const group of root.groups) {
      // group: /catalog/{root}/{group}
      // Пропускаем default-группы (slug совпадает с root) — это дублирующий URL
      if (group.slug === root.slug) continue;
      entries.push({
        loc: `${SITE_URL}/catalog/${root.slug}/${group.slug}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: 0.8
      });

      for (const leaf of group.leaves) {
        // leaf: /catalog/{root}/{group}/{leaf}
        entries.push({
          loc: `${SITE_URL}/catalog/${root.slug}/${group.slug}/${leaf.slug}`,
          lastmod: today,
          changefreq: 'weekly',
          priority: 0.7
        });
      }
    }
  }

  // 3. Товары: /products/{slug}
  // slug = slugify(name). Берём только id+name для скорости.
  const products = await sql`
    select p.id, p.name, p.updated_at
    from products p
    order by p.updated_at desc
  `;
  for (const p of products) {
    const slug = slugify(p.name);
    if (!slug) continue;
    const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : today;
    entries.push({
      loc: `${SITE_URL}/products/${slug}`,
      lastmod,
      changefreq: 'daily',
      priority: 0.6
    });
  }

  // Дедупликация по loc (могут быть товары с одинаковыми именами)
  const seen = new Set<string>();
  const unique = entries.filter((e) => {
    if (seen.has(e.loc)) return false;
    seen.add(e.loc);
    return true;
  });

  // Сборка XML
  const urlset = unique
    .map(
      (e) => `  <url>
    <loc>${xml(e.loc)}</loc>
    ${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

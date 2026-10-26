import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { catalogTree, filterCatalogRootsByAvailability } from '$lib/server/categories';
import { brandSlug } from '$lib/utils/slugify';
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

export const GET: RequestHandler = async ({ url }) => {
  const today = new Date().toISOString().split('T')[0];
  const entries: UrlEntry[] = [];

  // каждый домен (включая городские поддомены) отдаёт свой sitemap со своими URL;
  // на поддоменах товаров/брендов/статей нет — там только главная и категории
  const host = (url.host ?? '').toLowerCase().split(':')[0];
  const isCitySubdomain = host.startsWith('msk.') || host.startsWith('ufa.');
  const origin = isCitySubdomain ? `https://${host}` : SITE_URL;

  // 1. Статичные страницы
  const staticPages = [
    { path: '/', priority: 1.0 },
    { path: '/catalog', priority: 0.9 },
    { path: '/about', priority: 0.5 },
    { path: '/contacts', priority: 0.5 },
    { path: '/delivery', priority: 0.5 },
    { path: '/podbor', priority: 0.8 },
    { path: '/articles', priority: 0.7 },
    { path: '/privacy', priority: 0.2 },
    { path: '/offer', priority: 0.2 },
    { path: '/garantiya', priority: 0.4 }
  ];
  for (const p of staticPages) {
    entries.push({
      loc: `${origin}${p.path}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: p.priority
    });
  }

  // 2. Категории каталога: root → group → leaf
  // В sitemap только разделы, у которых есть товары с ценой (как в навигации сайта)
  let liveCatalog = catalogTree;
  try {
    const availabilityRows = await sql`
      SELECT DISTINCT
        catalog_root_slug AS root_slug,
        catalog_group_slug AS group_slug,
        catalog_leaf_slug AS leaf_slug
      FROM products
      WHERE catalog_root_slug IS NOT NULL
        AND price_rrc IS NOT NULL
    `;
    liveCatalog = filterCatalogRootsByAvailability(catalogTree, availabilityRows as any[]);
  } catch {
    // если запрос упал — отдаём как есть
  }
  for (const root of liveCatalog) {
    // root: /catalog/{root}
    entries.push({
      loc: `${origin}/catalog/${root.slug}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: 0.9
    });

    for (const group of root.groups) {
      // group: /catalog/{root}/{group}
      // Пропускаем default-группы (slug совпадает с root) — это дублирующий URL
      if (group.slug === root.slug) continue;
      entries.push({
        loc: `${origin}/catalog/${root.slug}/${group.slug}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: 0.8
      });

      for (const leaf of group.leaves) {
        // leaf: /catalog/{root}/{group}/{leaf}
        entries.push({
          loc: `${origin}/catalog/${root.slug}/${group.slug}/${leaf.slug}`,
          lastmod: today,
          changefreq: 'weekly',
          priority: 0.7
        });
      }
    }
  }

  // 3. Товары: /products/{slug}
  // slug = slugify(name). Берём только id+name для скорости.
  // На городских поддоменах пропускаем: товары там 301-ят на основной домен.
  if (!isCitySubdomain) {
  const products = await sql`
    select p.id, p.name, p.updated_at
    from products p
    where p.price_rrc is not null
      and (p.product_type is null or p.product_type not ilike 'комплект%')
    order by p.updated_at desc
  `;
  for (const p of products) {
    const slug = slugify(p.name);
    if (!slug) continue;
    const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : today;
    entries.push({
      loc: `${origin}/products/${slug}`,
      lastmod,
      changefreq: 'daily',
      priority: 0.6
    });
  }

  // 3.5 Бренды и 4. Статьи — тоже только на основном домене
  entries.push({
    loc: `${origin}/brands`,
    lastmod: today,
    changefreq: 'weekly',
    priority: 0.7
  });
  try {
    const brandRows = await sql`
      select brand->>'name' as name
      from products
      where price_rrc is not null and brand->>'name' is not null
      group by 1
      having count(*) >= 3
    `;
    for (const b of brandRows) {
      const slug = brandSlug(b.name);
      if (!slug) continue;
      entries.push({
        loc: `${origin}/brands/${slug}`,
        lastmod: today,
        changefreq: 'daily',
        priority: 0.6
      });
    }
  } catch {
    // таблицы ещё нет
  }

  // 4. Статьи: /articles и /articles/{slug}
  entries.push({
    loc: `${origin}/articles`,
    lastmod: today,
    changefreq: 'weekly',
    priority: 0.5
  });
  try {
    const articles = await sql`
      select slug, updated_at from articles where is_published = true
    `;
    for (const a of articles) {
      entries.push({
        loc: `${origin}/articles/${a.slug}`,
        lastmod: a.updated_at ? new Date(a.updated_at).toISOString().split('T')[0] : today,
        changefreq: 'monthly',
        priority: 0.5
      });
    }
  } catch {
    // таблицы ещё нет
  }

  // конец блока «только основной домен» (товары, бренды, статьи)
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

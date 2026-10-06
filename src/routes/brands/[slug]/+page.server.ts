import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { fetchProducts } from '$lib/server/catalogApi';
import { getCatalogRoots } from '$lib/server/categories';
import { buildBrandSeo } from '$lib/server/seoText';
import { brandSlug } from '$lib/utils/slugify';
import { getSeoOverride, safeCanonical } from '$lib/server/seoOverrides';

const perPage = 24;

export const load: PageServerLoad = async ({ params, url }) => {
  // все бренды с товарами и их слаги — ищем наш
  const brandRows = await sql`
    select brand->>'name' as name, count(*)::int as c
    from products
    where price_rrc is not null and brand->>'name' is not null
    group by 1
    having count(*) >= 3
  `;
  const brand = brandRows.find((b) => brandSlug(b.name) === params.slug?.toLowerCase());
  if (!brand) throw error(404, 'Бренд не найден');

  let page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
  if (!Number.isFinite(page) || page < 1) page = 1;

  const filters = { brands: [brand.name] };
  const firstLoad = await fetchProducts({ ...filters, sort: 'default' }, 1, 0);
  const total = firstLoad.total;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (page > pages) page = pages;
  const offset = (page - 1) * perPage;
  const { products } = await fetchProducts({ ...filters, sort: 'default' }, perPage, offset);

  // статистика для SEO-текста
  const statsRows = await sql`
    select min(price_rrc) as min_p, max(price_rrc) as max_p
    from products
    where price_rrc is not null and brand->>'name' = ${brand.name}
  `;
  const rootRows = await sql`
    select p.catalog_root_slug as slug, count(*)::int as c
    from products p
    where p.price_rrc is not null and p.catalog_root_slug is not null
      and p.brand->>'name' = ${brand.name}
    group by 1
    order by 2 desc
    limit 5
  `;
  const rootNames = rootRows
    .map((r) => getCatalogRoots().find((root) => root.slug === r.slug)?.name)
    .filter(Boolean) as string[];
  // быстрые ссылки по категориям бренда (внутренняя навигация на каталог с фильтром)
  const rootLinks = rootRows
    .map((r) => {
      const root = getCatalogRoots().find((x) => x.slug === r.slug);
      return root ? { name: root.name, slug: root.slug } : null;
    })
    .filter(Boolean) as { name: string; slug: string }[];

  const toRub = (v: any) => (v == null ? null : Math.round(Number(v) * 1000));
  const brandSlugKey = params.slug?.toLowerCase() ?? '';
  const metaO = await getSeoOverride(`brand:${brandSlugKey}`);
  const seo = buildBrandSeo({
    name: brand.name,
    count: total,
    minPrice: toRub(statsRows[0]?.min_p),
    maxPrice: toRub(statsRows[0]?.max_p),
    roots: rootNames
  });
  const rootLinksFinal = rootLinks;

  return {
    brand: brand.name,
    seoH1: metaO?.h1 ?? null,
    canonical: metaO?.canonical ? safeCanonical(metaO.canonical) : safeCanonical(`/brands/${brandSlugKey}`),
    metaDescription: metaO?.description ?? null,
    total,
    products,
    page,
    pages,
    seo,
    rootLinks: rootLinksFinal
  };
};

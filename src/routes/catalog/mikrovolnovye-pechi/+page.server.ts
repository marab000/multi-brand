import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';

function buildOrderBy(sort: string | null) {
  if (sort === 'price_asc')
    return 'ORDER BY CASE WHEN COUNT(pi.id) > 0 THEN 0 ELSE 1 END, COALESCE(p.price_rrc, p.price_ric) ASC NULLS LAST, p.created_at DESC';
  if (sort === 'price_desc')
    return 'ORDER BY CASE WHEN COUNT(pi.id) > 0 THEN 0 ELSE 1 END, COALESCE(p.price_rrc, p.price_ric) DESC NULLS LAST, p.created_at DESC';
  return 'ORDER BY CASE WHEN COUNT(pi.id) > 0 THEN 0 ELSE 1 END, p.created_at DESC';
}

export const load: PageServerLoad = async ({ url }) => {
  const perPage = 24;
  const sortParam = url.searchParams.get('sort');
  const sort = sortParam === 'price_asc' || sortParam === 'price_desc' ? sortParam : 'default';
  let page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
  if (!Number.isFinite(page) || page < 1) page = 1;
  const where = `
    WHERE p.price_rrc IS NOT NULL AND (
      (p.catalog_root_slug = 'melkaya-bytovaya-tehnika' AND p.catalog_group_slug = 'mikrovolnovye-pechi')
      OR (p.catalog_root_slug = 'vstraivaemaya-tehnika' AND p.catalog_group_slug = 'mikrovolnovye-pechi')
    )
  `;
  const countRows = await sql.unsafe(`SELECT COUNT(*)::int AS total FROM products p ${where}`);
  const total = Number(countRows[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (page > pages) page = pages;
  const offset = (page - 1) * perPage;
  const products = await sql.unsafe(`
    SELECT p.*, COUNT(*) OVER() AS total_count, COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL),'[]') AS images
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    ${where}
    GROUP BY p.id
    ${buildOrderBy(sort)}
    LIMIT ${perPage} OFFSET ${offset}
  `);
  return {
    products,
    total,
    perPage,
    page,
    pages,
    title: 'Микроволновые печи',
    category: 'Микроволновые печи',
    currentSearch: url.searchParams.toString(),
    isCatalogLanding: true,
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Микроволновые печи' }
    ],
    sections: [
      {
        title: 'Отдельностоящие микроволновые печи',
        text: 'Классические СВЧ для кухни, офиса или дачи.',
        href: '/catalog/melkaya-bytovaya-tehnika/mikrovolnovye-pechi'
      },
      {
        title: 'Встраиваемые микроволновые печи',
        text: 'Модели для установки в кухонную колонну или нишу.',
        href: '/catalog/vstraivaemaya-tehnika/mikrovolnovye-pechi/vstraivaemye-mikrovolnovye-pechi'
      }
    ]
  };
};

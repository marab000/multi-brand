import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

export const load: PageServerLoad = async ({ params, url }) => {
  const pathSegments = params.params ? params.params.split('/') : [];
  const categorySlug = pathSegments[0] || null;

  let category: null | string = null;
  if (categorySlug) {
    const rows = await sql`SELECT DISTINCT category FROM products`;
    const match = rows.find((r: any) => slugify(r.category?.trim()) === categorySlug);
    category = match ? match.category.trim() : null;
  }

  const filterConditions: string[] = [];
  const filterValues: any[] = [];

  if (category) {
    filterConditions.push(`trim(p.category)=$${filterValues.length + 1}`);
    filterValues.push(category);
  }

  const types = url.searchParams.getAll('type');
  if (types.length) {
    filterConditions.push(`trim(p.product_type)=ANY($${filterValues.length + 1})`);
    filterValues.push(types);
  }

  const brands = url.searchParams.getAll('brand');
  if (brands.length) {
    filterConditions.push(`lower(trim(p.brand->>'name'))=ANY($${filterValues.length + 1})`);
    filterValues.push(brands.map((b) => b.toLowerCase()));
  }

  const colorsSelected = url.searchParams.getAll('color');
  if (colorsSelected.length) {
    filterConditions.push(`lower(trim(p.specs->>'Цвет'))=ANY($${filterValues.length + 1})`);
    filterValues.push(colorsSelected.map((c) => c.toLowerCase()));
  }

  const priceMin = url.searchParams.get('price_min');
  const priceMax = url.searchParams.get('price_max');
  if (priceMin) {
    filterConditions.push(`p.price_rrc >= $${filterValues.length + 1}`);
    filterValues.push(Number(priceMin) / 1000);
  }
  if (priceMax) {
    filterConditions.push(`p.price_rrc <= $${filterValues.length + 1}`);
    filterValues.push(Number(priceMax) / 1000);
  }

  function specNumericExpr(keys: string[]) {
    return `COALESCE(${keys
      .map(
        (k) =>
          `CAST(replace(regexp_replace(p.specs->>'${k}','[^0-9,\\.]','','g'),',','.') AS numeric)`
      )
      .join(',')})`;
  }

  function addSpecRange(keys: string[], minParam: string, maxParam: string) {
    const min = url.searchParams.get(minParam);
    const max = url.searchParams.get(maxParam);
    const valueExpr = specNumericExpr(keys);

    if (min) {
      filterConditions.push(`${valueExpr} >= $${filterValues.length + 1}`);
      filterValues.push(Number(min));
    }

    if (max) {
      filterConditions.push(`${valueExpr} <= $${filterValues.length + 1}`);
      filterValues.push(Number(max));
    }
  }

  addSpecRange(
    ['Размер (Ширина)', 'Размер (Ширина), см', 'Ширина прибора'],
    'width_min',
    'width_max'
  );

  addSpecRange(
    ['Размер (Высота)', 'Размер (Высота), см', 'Высота прибора'],
    'height_min',
    'height_max'
  );

  addSpecRange(
    ['Размер (Глубина)', 'Размер (Глубина), см', 'Глубина прибора'],
    'depth_min',
    'depth_max'
  );

  const whereClause = filterConditions.length ? `WHERE ${filterConditions.join(' AND ')}` : '';

  const colorsQuery = `
    SELECT DISTINCT trim(p.specs->>'Цвет') as color
    FROM products p
    ${whereClause ? whereClause + ' AND' : 'WHERE'} p.specs ? 'Цвет'
    ORDER BY color
  `;

  let colorsList: string[] = [];

  try {
    const colorsRows = await sql.unsafe(colorsQuery, filterValues);
    colorsList = colorsRows.map((r: any) => r.color?.trim()).filter(Boolean);
  } catch (e) {
    console.error(e);
  }

  const perPage = 50;
  const pageNum = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
  const offset = (pageNum - 1) * perPage;

  const countQuery = `SELECT COUNT(*) AS total FROM products p ${whereClause}`;
  const countResult = await sql.unsafe(countQuery, filterValues);
  const total = Number(countResult[0].total);
  const pages = Math.ceil(total / perPage);

  const productsQuery = `
    SELECT p.*, COALESCE(json_agg(pi) FILTER (WHERE pi.id IS NOT NULL),'[]') AS images
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id=p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ${perPage}
    OFFSET ${offset}
  `;

  const products = await sql.unsafe(productsQuery, filterValues);

  return {
    products,
    category,
    total,
    perPage,
    page: pageNum,
    pages,
    currentSearch: url.searchParams.toString(),
    colors: colorsList
  };
};

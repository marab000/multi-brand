import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

export const load: PageServerLoad = async ({ params, url }) => {
  const pathSegments = params.params ? params.params.split('/') : [];
  const categorySlug = pathSegments[0] || null;
  let category: null | string = null;
  if (categorySlug) {
    const rows = await sql`select distinct category from products`;
    const match = rows.find((r: any) => slugify(r.category?.trim()) === categorySlug);
    category = match ? match.category.trim() : null;
  }
  const filterConditions: string[] = [];
  const filterValues: any[] = [];
  if (category) {
    filterConditions.push(`trim(p.category)=$${filterValues.length + 1}`);
    filterValues.push(category);
  }
  const brands = url.searchParams.getAll('brand');
  if (brands.length) {
    filterConditions.push(`trim(p.brand_name)=ANY($${filterValues.length + 1})`);
    filterValues.push(brands);
  }
  const types = url.searchParams.getAll('type');
  if (types.length) {
    filterConditions.push(`trim(p.product_type)=ANY($${filterValues.length + 1})`);
    filterValues.push(types);
  }
  if (url.searchParams.has('price_min')) {
    filterConditions.push(`(p.price_rrc*1000)>=$${filterValues.length + 1}`);
    filterValues.push(Number(url.searchParams.get('price_min')));
  }
  if (url.searchParams.has('price_max')) {
    filterConditions.push(`(p.price_rrc*1000)<=$${filterValues.length + 1}`);
    filterValues.push(Number(url.searchParams.get('price_max')));
  }
  const whereClause = filterConditions.length ? `WHERE ${filterConditions.join(' AND ')}` : '';
  const perPage = 50;
  const page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
  const offset = (page - 1) * perPage;
  const countQuery = `SELECT COUNT(*) AS total FROM products p ${whereClause}`;
  const countResult = await sql.unsafe(countQuery, filterValues);
  const total = Number(countResult[0].total);
  const pages = Math.ceil(total / perPage);
  const productsQuery = `
		SELECT p.*,COALESCE(json_agg(pi) FILTER (WHERE pi.id IS NOT NULL),'[]') AS images
		FROM products p
		LEFT JOIN product_images pi ON pi.product_id=p.id
		${whereClause}
		GROUP BY p.id
		ORDER BY p.created_at DESC
		LIMIT ${perPage} OFFSET ${offset}
		`;
  const products = await sql.unsafe(productsQuery, filterValues);
  const currentSearch = url.searchParams.toString();
  return {
    products,
    category,
    total,
    perPage,
    page,
    pages,
    currentSearch
  };
};

import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export async function GET({ url }) {
  try {
    const brands = url.searchParams.getAll('brand');
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');
    const color = url.searchParams.get('color');
    const priceFrom = url.searchParams.get('priceFrom');
    const priceTo = url.searchParams.get('priceTo');
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 9);
    const offset = (page - 1) * limit;
    let baseWhere = sql`WHERE 1=1`;
    if (category) baseWhere = sql`${baseWhere} AND p.category=${category}`;
    if (type) baseWhere = sql`${baseWhere} AND p.product_type=${type}`;
    if (search) baseWhere = sql`${baseWhere} AND p.name ILIKE ${'%' + search + '%'}`;
    const facets = await sql`
			SELECT
			ARRAY_AGG(DISTINCT p.brand_name) FILTER (WHERE p.brand_name IS NOT NULL) as brands,
			MIN(COALESCE(p.price_ric,p.price_rrc))*1000 as min_price,
			MAX(COALESCE(p.price_ric,p.price_rrc))*1000 as max_price
			FROM products p
			${baseWhere}
			`;
    let where = baseWhere;
    if (brands.length) {
      where = sql`${where} AND lower(p.brand_name)=ANY(${brands.map((b) => b.toLowerCase())})`;
    }
    if (color) {
      where = sql`${where} AND lower(p.color)=lower(${color})`;
    }
    if (priceFrom) {
      where = sql`${where} AND COALESCE(p.price_ric,p.price_rrc)*1000 >= ${priceFrom}`;
    }
    if (priceTo) {
      where = sql`${where} AND COALESCE(p.price_ric,p.price_rrc)*1000 <= ${priceTo}`;
    }
    const totalResult = await sql`
			SELECT COUNT(*)
			FROM products p
			${where}
			`;
    const total = Number(totalResult[0].count);
    const pages = Math.ceil(total / limit);
    const products = await sql`
			SELECT
			p.*,
			COALESCE(p.price_ric,p.price_rrc) as price,
			COALESCE(
			json_agg(
			json_build_object(
			'url',pi.url,
			'position',pi.position
			)
			ORDER BY pi.position
			) FILTER (WHERE pi.id IS NOT NULL),
			'[]'
			) as images
			FROM products p
			LEFT JOIN product_images pi
			ON pi.product_id=p.id
			${where}
			GROUP BY p.id
			ORDER BY p.id DESC
			LIMIT ${limit}
			OFFSET ${offset}
			`;
    return json({
      products,
      total,
      page,
      pages,
      brands: facets[0].brands ?? [],
      minPrice: facets[0].min_price ?? 0,
      maxPrice: facets[0].max_price ?? 0
    });
  } catch (e) {
    console.error('API ERROR:', e);
    return json({ error: String(e) }, { status: 500 });
  }
}

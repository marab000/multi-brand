import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export async function GET({ url }) {
  try {
    const brand = url.searchParams.get('brand');
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 9);
    const offset = (page - 1) * limit;

    let where = sql`WHERE 1=1`;

    if (brand) where = sql`${where} AND lower(p.brand_name)=lower(${brand})`;
    if (category) where = sql`${where} AND p.category=${category}`;
    if (type) where = sql`${where} AND p.product_type=${type}`;
    if (search) where = sql`${where} AND p.name ILIKE ${'%' + search + '%'}`;

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

    return json({ products, total, page, pages });
  } catch (e) {
    console.error('API ERROR:', e);
    return json({ error: String(e) }, { status: 500 });
  }
}

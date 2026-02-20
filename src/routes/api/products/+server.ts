import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export async function GET({ url }) {
  try {
    const brand = url.searchParams.get('brand');
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    let query = sql`
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'url', pi.url,
              'position', pi.position
            )
            ORDER BY pi.position
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN product_images pi 
        ON pi.product_id = p.id
      WHERE 1=1
    `;

    if (brand) {
      query = sql`${query} AND p.brand_name ILIKE ${'%' + brand + '%'}`;
    }

    if (category) {
      query = sql`${query} AND p.category = ${category}`;
    }

    if (type) {
      query = sql`${query} AND p.product_type = ${type}`;
    }

    if (search) {
      query = sql`${query} AND p.name ILIKE ${'%' + search + '%'}`;
    }

    query = sql`${query} GROUP BY p.id`;

    const products = await query;

    return json(products);
  } catch (e) {
    console.error('API ERROR:', e);
    return json({ error: String(e) }, { status: 500 });
  }
}

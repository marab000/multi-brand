import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export async function GET() {
  try {
    const brands = await sql`
      SELECT DISTINCT brand_name
      FROM products
      WHERE brand_name IS NOT NULL
      ORDER BY brand_name
    `;
    return json(brands);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, { status: 500 });
  }
}
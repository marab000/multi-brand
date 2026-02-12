import type { RequestHandler } from './$types';
import { sql } from '$lib/db';

export const GET: RequestHandler = async () => {
  const rows = await sql`
    SELECT brand_name, category, product_type
    FROM products
    GROUP BY brand_name, category, product_type
    ORDER BY brand_name, category, product_type
  `;

  const tree: Record<string, any> = {};

  for (const row of rows) {
    if (!tree[row.brand_name]) {
      tree[row.brand_name] = {};
    }

    if (!tree[row.brand_name][row.category]) {
      tree[row.brand_name][row.category] = [];
    }

    tree[row.brand_name][row.category].push(row.product_type);
  }

  return new Response(JSON.stringify(tree), {
    headers: { 'Content-Type': 'application/json' }
  });
};

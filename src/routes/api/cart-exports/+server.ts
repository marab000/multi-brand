import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { getProductPrice } from '$lib/utils/pricing';
import type { Product } from '$lib/types/product';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const userId = locals.user?.id ?? null;
    if (!items.length) throw error(400, 'Cart is empty');

    // Пересчитываем цены из БД — чтобы КП и PDF совпадали с актуальными ценами
    const ids = items.map((i: any) => String(i.id ?? '')).filter(Boolean);
    const products = ids.length
      ? await sql<Product[]>`
          SELECT id, name, description, brand, category, product_type,
                 catalog_root_slug, catalog_root_name, catalog_group_slug, catalog_group_name,
                 catalog_leaf_slug, catalog_leaf_name, price_rrc, price_opt, price_ric,
                 specs, raw, created_at, updated_at, external_id
          FROM products
          WHERE id = ANY(${ids}::uuid[])
        `
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const normalizedItems = items.map((i: any) => {
      const id = String(i.id ?? '');
      const product = productMap.get(id);
      const qty = Math.max(1, Number(i.qty) || 1);
      const price = product ? getProductPrice(product) : Number(i.price) || 0;
      return {
        id,
        name: product?.name ?? String(i.name ?? ''),
        price,
        oldPrice: i.oldPrice ?? null,
        qty,
        slug: i.slug ? String(i.slug) : null,
        image: i.image ?? null
      };
    });
    const totalPrice = normalizedItems.reduce(
      (sum: number, i: any) => sum + i.price * i.qty,
      0
    );

    const result = await sql`
      INSERT INTO cart_exports (items, total_price, user_id)
      VALUES (${sql.json(normalizedItems)}, ${totalPrice}, ${userId})
      RETURNING id, export_number, created_at
    `;
    return json(result[0]);
  } catch (e) {
    console.error('cart export error:', e);
    throw error(500, 'Failed to create cart export');
  }
};
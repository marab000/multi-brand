import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { sendNewOrderEmail } from '$lib/server/email';
import { getProductPrice } from '$lib/utils/pricing';
import type { RequestHandler } from './$types';
import type { Product } from '$lib/types/product';

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const phone = String(body?.phone ?? '').trim();
  const items = Array.isArray(body?.items) ? body.items : [];
  const user = locals.user;
  if (!name || !phone || !items.length)
    return json({ message: 'Некорректные данные заказа' }, { status: 400 });
  const ids = items.map((i: any) => String(i.id ?? '')).filter(Boolean);
  const products = ids.length
    ? await sql<Product[]>`
        SELECT id, name, description, brand, category, product_type, catalog_root_slug, catalog_root_name, catalog_group_slug, catalog_group_name, catalog_leaf_slug, catalog_leaf_name, price_rrc, price_opt, price_ric, specs, raw, created_at, updated_at, external_id
        FROM products
        WHERE id = ANY(${ids})
      `
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));
  const normalizedItems = items.map((i: any) => {
    const id = String(i.id ?? '');
    const product = productMap.get(id);
    const qty = Math.max(1, Number(i.qty) || 1);
    return {
      id,
      name: product?.name ?? String(i.name ?? ''),
      price: product ? getProductPrice(product) : Number(i.price) || 0,
      qty,
      slug: i.slug ? String(i.slug) : null
    };
  });
  const total = normalizedItems.reduce((sum: number, i: any) => sum + i.price * i.qty, 0);
  const rows = await sql`
    INSERT INTO orders (user_id, user_data, items, total_price)
    VALUES (${user?.id ?? null}, ${sql.json({ name, phone })}, ${sql.json(normalizedItems)}, ${total})
    RETURNING id
  `;
  const orderId = rows[0]?.id;
  try {
    await sendNewOrderEmail({ id: orderId, name, phone, total, items: normalizedItems });
  } catch (e) {
    console.error('Order email error:', e);
  }
  return json({ ok: true, id: orderId });
};

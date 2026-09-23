import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { getProductPrice, getBaseProductPrice } from '$lib/utils/pricing';
import { hasRole } from '$lib/server/auth';
import type { Product } from '$lib/types/product';

export const POST: RequestHandler = async ({ request, locals }) => {
  // КП создают только авторизованные — гостю предлагаем зарегистрироваться
  if (!locals.user) throw error(401, 'Для создания КП нужно войти или зарегистрироваться');
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const userId = locals.user.id;
    if (!items.length) throw error(400, 'Cart is empty');

    // Ручная скидка: только дизайнеры, максимум 30%
    const MAX_DESIGNER_DISCOUNT = 30;
    let discountPercent = 0;
    if (hasRole(locals.user, 'designer')) {
      discountPercent = Math.min(
        MAX_DESIGNER_DISCOUNT,
        Math.max(0, Math.round(Number(body.discountPercent) || 0))
      );
    }

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
      // Ручная скидка дизайнера заменяет глобальную акцию, а не суммируется с ней:
      // базой берём чистую РРЦ без глобального дисконта
      const price = product
        ? Number(
            discountPercent > 0
              ? getBaseProductPrice(product) ?? getProductPrice(product)
              : getProductPrice(product)
          ) || 0
        : Number(i.price) || 0;
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
    // Итог со скидкой, округляем до рубля
    const discountedTotal = Math.round(totalPrice * (1 - discountPercent / 100));

    const result = await sql`
      INSERT INTO cart_exports (items, total_price, user_id, discount_percent)
      VALUES (${sql.json(normalizedItems)}, ${discountedTotal}, ${userId}, ${discountPercent})
      RETURNING id, export_number, discount_percent, total_price, items, created_at
    `;
    return json(result[0]);
  } catch (e) {
    console.error('cart export error:', e);
    throw error(500, 'Failed to create cart export');
  }
};
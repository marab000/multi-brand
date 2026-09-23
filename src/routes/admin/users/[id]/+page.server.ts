import { error } from '@sveltejs/kit';
import { sql } from '$lib/db';

export const load = async ({ params }) => {
  const id = Number(params.id);
  if (!id) throw error(400, 'Invalid ID');

  const rows = await sql`
    SELECT id, email, phone, full_name, roles, created_at
    FROM users WHERE id = ${id}
  `;
  if (!rows.length) throw error(404, 'User not found');

  const exports = await sql`
    SELECT id, export_number, items, total_price, discount_percent, created_at,
           (SELECT count(*)::int FROM cart_exports c2 WHERE c2.created_at > c1.created_at) as older_count
    FROM cart_exports c1 WHERE user_id = ${id}
    ORDER BY created_at DESC
    LIMIT 20
  `;
  // Страница пагинации в /admin/cart-exports (по 10 КП на страницу, сортировка свежие сверху)
  const exportsWithPage = exports.map((e: any) => ({
    ...e,
    page: Math.floor(e.older_count / 10) + 1
  }));

  const orders = await sql`
    SELECT id, status, total_price, created_at
    FROM orders WHERE user_id = ${id}
    ORDER BY created_at DESC
    LIMIT 20
  `;

  return { user: rows[0], exports: exportsWithPage, orders };
};

import { sql } from '$lib/db';

export const load = async () => {
  // Список всех пользователей + сколько КП и заказов у каждого
  const users = await sql`
    SELECT u.id, u.email, u.phone, u.full_name, u.roles, u.created_at,
           (SELECT count(*)::int FROM cart_exports ce WHERE ce.user_id = u.id) as exports_count,
           (SELECT count(*)::int FROM orders o WHERE o.user_id = u.id) as orders_count
    FROM users u
    ORDER BY u.created_at DESC
  `;
  return { users };
};

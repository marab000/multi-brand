import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const totalPrice = Number(body.total_price || 0);
    const userId = locals.user?.id ?? null;
    if (!items.length) throw error(400, 'Cart is empty');
    const result = await sql`
      INSERT INTO cart_exports (items, total_price, user_id)
      VALUES (${sql.json(items)}, ${totalPrice}, ${userId})
      RETURNING id, export_number, created_at
    `;
    return json(result[0]);
  } catch (e) {
    console.error('cart export error:', e);
    throw error(500, 'Failed to create cart export');
  }
};
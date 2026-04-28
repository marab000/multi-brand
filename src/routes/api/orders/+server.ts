import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { sendNewOrderEmail } from '$lib/server/email';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const phone = String(body?.phone ?? '').trim();
  const items = Array.isArray(body?.items) ? body.items : [];
  const user = locals.user;
  if (!name || !phone || !items.length)
    return json({ message: 'Некорректные данные заказа' }, { status: 400 });
  const normalizedItems = items.map((i: any) => ({
    id: String(i.id ?? ''),
    name: String(i.name ?? ''),
    price: Number(i.price),
    qty: Number(i.qty),
    slug: i.slug ? String(i.slug) : null
  }));
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

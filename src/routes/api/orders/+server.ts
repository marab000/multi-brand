import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export const POST = async ({ request }) => {
  const body = await request.json();

  const { name, phone, items } = body;

  const normalizedItems = items.map((i: any) => ({
    ...i,
    price: Number(i.price)
  }));

  const total = normalizedItems.reduce((sum: number, i: any) => sum + i.price * i.qty, 0);

  await sql`
    INSERT INTO orders (user_data, items, total_price)
    VALUES (
      ${sql.json({ name, phone })},
      ${sql.json(normalizedItems)},
      ${total}
    )
  `;

  return json({ ok: true });
};

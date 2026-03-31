import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export const POST = async ({ request }) => {
  const body = await request.json();

  const { phone, items } = body;

  await sql`
    INSERT INTO orders (phone, items)
    VALUES (${phone}, ${JSON.stringify(items)})
  `;

  return json({ ok: true });
};
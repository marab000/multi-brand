import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export const POST = async ({ request }) => {
  const { id, status } = await request.json();

  await sql`
    UPDATE orders SET status=${status} WHERE id=${id}
  `;

  return json({ ok: true });
};

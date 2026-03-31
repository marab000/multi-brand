import { sql } from '$lib/db';

export const load = async () => {
  const orders = await sql`
    SELECT * FROM orders ORDER BY created_at DESC
  `;

  return { orders };
};

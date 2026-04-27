import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/');
  const orders = await sql`
    select id, items, status, created_at, total_price
    from orders
    where user_id = ${locals.user.id}
    order by created_at desc
  `;
  return { orders };
};

import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/');
  const offers = await sql`
    select id, export_number, items, total_price, discount_percent, created_at
    from cart_exports
    where user_id = ${locals.user.id}
    order by created_at desc
  `;
  return { offers };
};

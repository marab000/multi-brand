import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';

export const load: PageServerLoad = async () => {
  const slides = await sql`
    SELECT id, desktop_url, mobile_url, position, is_active, created_at
    FROM slides ORDER BY position ASC, id ASC
  `;
  return { slides };
};

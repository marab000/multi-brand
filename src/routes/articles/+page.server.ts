import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';

export const load: PageServerLoad = async () => {
  const articles = await sql`
    SELECT id, slug, title, description, cover_url, created_at
    FROM articles
    WHERE is_published = true
    ORDER BY created_at DESC
  `;
  return { articles };
};

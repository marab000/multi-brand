import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';

export const load: PageServerLoad = async () => {
  const articles = await sql`
    SELECT id, slug, title, description, cover_url, is_published, created_at, updated_at,
      (SELECT count(*) FROM article_blocks ab WHERE ab.article_id = articles.id) as blocks_count
    FROM articles
    ORDER BY created_at DESC
  `;
  return { articles };
};

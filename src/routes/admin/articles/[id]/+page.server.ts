import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const id = Number(params.id);
  if (!id) throw error(400, 'Invalid ID');

  const articles = await sql`
    SELECT id, slug, title, description, cover_url, is_published, created_at
    FROM articles WHERE id=${id}
  `;
  if (!articles.length) throw error(404, 'Article not found');

  const blocks = await sql`
    SELECT id, position, type, content
    FROM article_blocks WHERE article_id=${id}
    ORDER BY position ASC, id ASC
  `;

  return { article: articles[0], blocks };
};

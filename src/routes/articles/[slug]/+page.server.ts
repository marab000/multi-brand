import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { error } from '@sveltejs/kit';
import { checkAdmin } from '$lib/server/adminAuth';

export const load: PageServerLoad = async ({ params, cookies, locals }) => {
  const articles = await sql`
    SELECT id, slug, title, description, cover_url, is_published, created_at
    FROM articles
    WHERE slug=${params.slug}
    LIMIT 1
  `;

  let isAdmin = false;
  try {
    await checkAdmin(cookies, locals);
    isAdmin = true;
  } catch {
    isAdmin = false;
  }

  // черновики видны только админам (превью из редактора)
  if (!articles.length || (!articles[0].is_published && !isAdmin)) {
    throw error(404, 'Статья не найдена');
  }

  const blocks = await sql`
    SELECT id, position, type, content
    FROM article_blocks
    WHERE article_id=${articles[0].id}
    ORDER BY position ASC, id ASC
  `;

  return { article: articles[0], blocks };
};

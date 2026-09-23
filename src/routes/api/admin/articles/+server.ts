import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { checkAdmin } from '$lib/server/adminAuth';
import { slugify } from '$lib/utils/slugify';
import type { RequestHandler } from './$types';

// POST — создать статью (JSON: title, description?)
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const body = await request.json();
  const title = String(body?.title ?? '').trim();
  if (!title) throw error(400, 'Заголовок обязателен');

  // Уникальный slug
  let slug = slugify(title) || `article-${Date.now()}`;
  const existing = await sql`SELECT id FROM articles WHERE slug=${slug}`;
  if (existing.length) slug = `${slug}-${Date.now().toString(36)}`;

  const result = await sql`
    INSERT INTO articles (slug, title, description)
    VALUES (${slug}, ${title}, ${String(body?.description ?? '')})
    RETURNING id, slug, title, description, cover_url, is_published, created_at
  `;
  return json(result[0]);
};

import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { checkAdmin } from '$lib/server/adminAuth';
import type { RequestHandler } from './$types';

const BLOCK_TYPES = ['heading', 'text', 'image', 'list', 'callout', 'cta', 'video'];

// POST — добавить блок (JSON: type, content)
export const POST: RequestHandler = async ({ params, request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const articleId = Number(params.id);
  if (!articleId) throw error(400, 'Invalid article ID');

  const body = await request.json();
  const type = String(body?.type ?? '');
  if (!BLOCK_TYPES.includes(type)) throw error(400, `Неизвестный тип блока: ${type}`);

  const maxPos = await sql`SELECT COALESCE(MAX(position), -1) as max_pos FROM article_blocks WHERE article_id=${articleId}`;
  const nextPos = (maxPos[0]?.max_pos ?? -1) + 1;

  const result = await sql`
    INSERT INTO article_blocks (article_id, position, type, content)
    VALUES (${articleId}, ${nextPos}, ${type}, ${sql.json(body?.content ?? {})})
    RETURNING id, article_id, position, type, content
  `;
  return json(result[0]);
};

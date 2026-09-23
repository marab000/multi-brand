import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { checkAdmin } from '$lib/server/adminAuth';
import { deleteImage } from '$lib/server/s3';
import type { RequestHandler } from './$types';

// PATCH — обновить блок (content, position)
export const PATCH: RequestHandler = async ({ params, request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const articleId = Number(params.id);
  const blockId = Number(params.blockId);
  if (!articleId || !blockId) throw error(400, 'Invalid ID');

  const body = await request.json();
  const updates: string[] = [];
  const values: any[] = [];

  if (body.content && typeof body.content === 'object') {
    updates.push(`content = $${values.length + 1}`);
    values.push(body.content); // postgres сериализует объект сам, JSON.stringify дал бы двойное кодирование
  }
  if (typeof body.position === 'number') {
    updates.push(`position = $${values.length + 1}`);
    values.push(body.position);
  }
  if (!updates.length) throw error(400, 'Nothing to update');

  values.push(blockId);
  const result = await sql.unsafe(
    `UPDATE article_blocks SET ${updates.join(', ')} WHERE id = $${values.length} AND article_id = ${articleId} RETURNING id, article_id, position, type, content`,
    values
  );
  if (!result.length) throw error(404, 'Block not found');
  return json(result[0]);
};

// DELETE — удалить блок (+картинку из S3 если image)
export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const articleId = Number(params.id);
  const blockId = Number(params.blockId);
  if (!articleId || !blockId) throw error(400, 'Invalid ID');

  const rows = await sql`
    SELECT type, content FROM article_blocks WHERE id=${blockId} AND article_id=${articleId}
  `;
  if (!rows.length) throw error(404, 'Block not found');

  if (rows[0].type === 'image' && rows[0].content?.url) {
    await deleteImage(rows[0].content.url);
  }

  await sql`DELETE FROM article_blocks WHERE id=${blockId}`;
  return json({ ok: true });
};

import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { checkAdmin } from '$lib/server/adminAuth';
import { deleteImage } from '$lib/server/s3';
import type { RequestHandler } from './$types';

// PATCH — обновить статью (title, description, slug, cover_url, is_published)
export const PATCH: RequestHandler = async ({ params, request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const id = Number(params.id);
  if (!id) throw error(400, 'Invalid ID');

  const body = await request.json();
  const updates: string[] = [];
  const values: any[] = [];

  const fields = ['title', 'description', 'cover_url', 'slug'] as const;
  for (const f of fields) {
    if (typeof body[f] === 'string' && body[f].trim()) {
      updates.push(`${f} = $${values.length + 1}`);
      values.push(body[f].trim());
    }
  }
  if (typeof body.is_published === 'boolean') {
    updates.push(`is_published = $${values.length + 1}`);
    values.push(body.is_published);
  }
  if (!updates.length) throw error(400, 'Nothing to update');

  updates.push('updated_at = now()');
  values.push(id);
  try {
    const result = await sql.unsafe(
      `UPDATE articles SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, slug, title, description, cover_url, is_published, created_at, updated_at`,
      values
    );
    return json(result[0]);
  } catch (e: any) {
    if (e?.code === '23505') throw error(400, 'Статья с таким slug уже существует');
    throw e;
  }
};

// DELETE — удалить статью (+ картинки блоков и обложку из S3)
export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const id = Number(params.id);
  if (!id) throw error(400, 'Invalid ID');

  const rows = await sql`SELECT cover_url FROM articles WHERE id=${id}`;
  if (!rows.length) throw error(404, 'Article not found');
  if (rows[0].cover_url) await deleteImage(rows[0].cover_url);

  // Картинки из image-блоков
  const blocks = await sql`
    SELECT content FROM article_blocks WHERE article_id=${id} AND type='image'
  `;
  for (const b of blocks) {
    if (b.content?.url) await deleteImage(b.content.url);
  }

  await sql`DELETE FROM articles WHERE id=${id}`;
  return json({ ok: true });
};

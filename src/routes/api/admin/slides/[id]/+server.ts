import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { deleteImage } from '$lib/server/s3';
import type { RequestHandler } from './$types';

const COOKIE = 'admin_session';

async function checkAdmin(cookies: any) {
  const session = cookies.get(COOKIE);
  if (!session) throw error(401, 'Unauthorized');
  const users = await sql`SELECT id FROM admin_users WHERE id=${Number(session)}`;
  if (!users.length) throw error(401, 'Unauthorized');
}

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  await checkAdmin(cookies);

  const id = Number(params.id);
  if (!id) throw error(400, 'Invalid ID');

  const rows = await sql`SELECT desktop_url, mobile_url FROM slides WHERE id=${id}`;
  if (!rows.length) throw error(404, 'Slide not found');

  const slide = rows[0];

  // Удаляем картинки из S3
  await Promise.all([deleteImage(slide.desktop_url), deleteImage(slide.mobile_url)]);

  // Удаляем из БД
  await sql`DELETE FROM slides WHERE id=${id}`;

  return json({ ok: true });
};

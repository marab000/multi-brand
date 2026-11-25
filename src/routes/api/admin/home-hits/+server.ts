import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { checkAdmin } from '$lib/server/adminAuth';
import { addHomeHit, listHomeHits, moveHomeHit, removeHomeHit } from '$lib/server/homeHits';
import type { RequestHandler } from './$types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown) => typeof v === 'string' && UUID_RE.test(v);

// GET — текущий список хитов; POST { productId } — добавить в конец;
// PATCH { productId, direction: 'up' | 'down' } — переставить;
// DELETE { productId } — убрать из списка
export const GET: RequestHandler = async ({ cookies, locals }) => {
  await checkAdmin(cookies, locals);
  return json({ items: await listHomeHits() });
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const { productId } = await request.json();
  if (!isUuid(productId)) throw error(400, 'Некорректный товар');
  const found = await sql`SELECT 1 FROM products WHERE id = ${productId}`;
  if (!found.length) throw error(404, 'Товар не найден в каталоге');

  try {
    await addHomeHit(productId);
  } catch (e: any) {
    throw error(400, e?.message ?? 'Не удалось добавить');
  }
  return json({ ok: true, items: await listHomeHits() });
};

export const PATCH: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const { productId, direction } = await request.json();
  if (!isUuid(productId)) throw error(400, 'Некорректный товар');
  if (direction !== 'up' && direction !== 'down') throw error(400, 'Некорректное направление');
  await moveHomeHit(productId, direction);
  return json({ ok: true, items: await listHomeHits() });
};

export const DELETE: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const { productId } = await request.json();
  if (!isUuid(productId)) throw error(400, 'Некорректный товар');
  await removeHomeHit(productId);
  return json({ ok: true, items: await listHomeHits() });
};

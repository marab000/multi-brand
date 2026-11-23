import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { checkAdmin } from '$lib/server/adminAuth';
import {
  addRecommendation,
  listProductsWithRecommendations,
  listRecommendations,
  moveRecommendation,
  removeRecommendation,
  searchProducts,
  updateNote
} from '$lib/server/productRecommendations';
import type { RequestHandler } from './$types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown) => typeof v === 'string' && UUID_RE.test(v);

// GET ?q=… — поиск товара по названию (выбор базового и рекомендуемого)
// GET ?productId=… — список рекомендаций товара
// GET ?overview=1 — товары, у которых уже заданы рекомендации
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const productId = url.searchParams.get('productId');
  if (productId) {
    if (!isUuid(productId)) throw error(400, 'Некорректный товар');
    return json({ items: await listRecommendations(productId) });
  }
  if (url.searchParams.get('overview')) {
    return json({ linked: await listProductsWithRecommendations() });
  }
  const q = url.searchParams.get('q') ?? '';
  return json({ products: await searchProducts(q) });
};

// POST { productId, recommendedProductId, note? } — добавить связь
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const body = await request.json();
  const { productId, recommendedProductId } = body;
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

  if (!isUuid(productId) || !isUuid(recommendedProductId)) {
    throw error(400, 'Некорректный товар');
  }
  if (productId === recommendedProductId) {
    throw error(400, 'Товар не может рекомендовать сам себя');
  }
  // оба товара должны существовать
  const found = await sql`
    SELECT id FROM products WHERE id IN (${productId}, ${recommendedProductId})
  `;
  if (found.length < 2) throw error(404, 'Товар не найден в каталоге');

  try {
    await addRecommendation(productId, recommendedProductId, note);
  } catch (e: any) {
    // 23505 — UNIQUE (product_id, recommended_product_id): связь уже есть
    if (e?.code === '23505') {
      throw error(400, 'Этот товар уже есть в рекомендациях');
    }
    throw e;
  }
  return json({ ok: true, items: await listRecommendations(productId) });
};

// PATCH { id, note? } | { id, direction: 'up' | 'down' } — правка подписи / порядок
export const PATCH: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const body = await request.json();
  if (!isUuid(body.id)) throw error(400, 'Некорректная связь');

  if (body.direction === 'up' || body.direction === 'down') {
    await moveRecommendation(body.id, body.direction);
  } else if (body.note !== undefined) {
    await updateNote(
      body.id,
      typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
    );
  } else {
    throw error(400, 'Нечего обновлять');
  }

  const [row] = await sql`SELECT product_id FROM product_recommendations WHERE id = ${body.id}`;
  if (!row) throw error(404, 'Связь не найдена');
  return json({ ok: true, items: await listRecommendations(row.product_id) });
};

// DELETE { id } — убрать связь
export const DELETE: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const body = await request.json();
  if (!isUuid(body.id)) throw error(400, 'Некорректная связь');

  const [row] = await sql`SELECT product_id FROM product_recommendations WHERE id = ${body.id}`;
  if (!row) throw error(404, 'Связь не найдена');
  await removeRecommendation(body.id);
  return json({ ok: true, items: await listRecommendations(row.product_id) });
};

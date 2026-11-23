import { sql } from '$lib/db';

/**
 * «Рекомендации к товару»: ручные связи товар → товар, бренд-независимые
 * (наполняются в /admin/recommendations). Если у товара есть утверждённые
 * связи, в карточке они заменяют автоподбор «С этим товаром покупают»;
 * нет связей — работает прежняя автологика.
 */

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS product_recommendations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      note TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (product_id, recommended_product_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS product_recommendations_product_id_idx ON product_recommendations (product_id)`;
  tableReady = true;
}

/** Рекомендации товара в форме карточек блока «С этим товаром покупают» (+ note) */
export async function getRecommendations(productId: string): Promise<any[]> {
  await ensureTable();
  return sql`
    SELECT p.id, p.name, p.product_type, p.price_rrc, p.price_ric, p.specs, p.stock,
           p.brand,
           COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images,
           r.note
    FROM product_recommendations r
    JOIN products p ON p.id = r.recommended_product_id
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE r.product_id = ${productId}
      AND p.id <> r.product_id
      AND p.price_rrc IS NOT NULL
    GROUP BY p.id, r.note, r.position, r.created_at
    ORDER BY r.position ASC, r.created_at ASC
  `;
}

/** Строки связей для админки: рекомендуемый товар + служебные поля связи */
export async function listRecommendations(productId: string) {
  await ensureTable();
  return sql`
    SELECT r.id, r.recommended_product_id, r.note, r.position,
           p.name, p.product_type, p.price_rrc, p.brand,
           COALESCE(
             (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position ASC LIMIT 1),
             NULL
           ) AS image_url
    FROM product_recommendations r
    JOIN products p ON p.id = r.recommended_product_id
    WHERE r.product_id = ${productId}
    ORDER BY r.position ASC, r.created_at ASC
  `;
}

/** Обзор для админки: товары, у которых уже заданы рекомендации */
export async function listProductsWithRecommendations() {
  await ensureTable();
  return sql`
    SELECT r.product_id AS id, p.name, p.product_type, p.price_rrc, p.brand,
           COUNT(*) AS rec_count,
           (
             SELECT pi.url FROM product_images pi
             WHERE pi.product_id = r.product_id
             ORDER BY pi.position ASC LIMIT 1
           ) AS image_url
    FROM product_recommendations r
    JOIN products p ON p.id = r.product_id
    GROUP BY r.product_id, p.name, p.product_type, p.price_rrc, p.brand
    ORDER BY p.name ASC
  `;
}

/** Поиск товара по названию/типу для выбора в админке */
export async function searchProducts(query: string, limit = 8) {
  const q = query.trim();
  if (q.length < 2) return [];
  return sql`
    SELECT p.id, p.name, p.product_type, p.price_rrc, p.brand,
           COALESCE(
             (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position ASC LIMIT 1),
             NULL
           ) AS image_url
    FROM products p
    WHERE p.name ILIKE ${'%' + q + '%'}
      AND p.price_rrc IS NOT NULL
    ORDER BY p.name ASC
    LIMIT ${limit}
  `;
}

/** Добавить связь: в конец списка (position = max + 1) */
export async function addRecommendation(
  productId: string,
  recommendedProductId: string,
  note: string | null
) {
  await ensureTable();
  const [row] = await sql`
    SELECT COALESCE(MAX(position) + 1, 0) AS next
    FROM product_recommendations
    WHERE product_id = ${productId}
  `;
  await sql`
    INSERT INTO product_recommendations (product_id, recommended_product_id, note, position)
    VALUES (${productId}, ${recommendedProductId}, ${note}, ${row.next})
  `;
}

/**
 * Переставить связь (direction: up/down) и перенумеровать позиции 0..n-1
 * списка товара — так у позиций не копятся дыры после удалений
 */
export async function moveRecommendation(id: string, direction: 'up' | 'down') {
  await ensureTable();
  const [row] =
    await sql`SELECT product_id, position FROM product_recommendations WHERE id = ${id}`;
  if (!row) return;
  const neighbors = await sql`
    SELECT id FROM product_recommendations
    WHERE product_id = ${row.product_id}
    ORDER BY position ASC, created_at ASC
  `;
  const idx = neighbors.findIndex((n: any) => n.id === id);
  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= neighbors.length) return;
  [neighbors[idx], neighbors[swapWith]] = [neighbors[swapWith], neighbors[idx]];
  for (let i = 0; i < neighbors.length; i++) {
    await sql`UPDATE product_recommendations SET position = ${i}, updated_at = now() WHERE id = ${neighbors[i].id}`;
  }
}

export async function updateNote(id: string, note: string | null) {
  await ensureTable();
  await sql`UPDATE product_recommendations SET note = ${note}, updated_at = now() WHERE id = ${id}`;
}

export async function removeRecommendation(id: string) {
  await ensureTable();
  await sql`DELETE FROM product_recommendations WHERE id = ${id}`;
}

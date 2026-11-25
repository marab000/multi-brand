import { sql } from '$lib/db';

/**
 * «Хиты продаж» на главной: ручной список товаров, порядок в списке =
 * порядок карточек (наполняется в /admin/hits). Пустой список — секция
 * на главной не выводится вовсе: автоподбора по брендам больше нет.
 */

export const HOME_HITS_MAX = 20;

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS home_hits (
      product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  tableReady = true;
}

/** Карточки блока «Хиты продаж» — тот же набор полей, что давал автоподбор */
export async function getHomeHits(): Promise<any[]> {
  await ensureTable();
  return sql`
    SELECT p.id, p.name, p.product_type, p.price_rrc, p.price_ric, p.specs,
           p.brand,
           COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images
    FROM home_hits h
    JOIN products p ON p.id = h.product_id
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE p.price_rrc IS NOT NULL
      AND EXISTS (SELECT 1 FROM product_images x WHERE x.product_id = p.id)
    GROUP BY p.id, h.position, h.created_at
    ORDER BY h.position ASC, h.created_at ASC
  `;
}

/** Список для админки: товар + одно фото для превью */
export async function listHomeHits() {
  await ensureTable();
  return sql`
    SELECT h.product_id AS id, p.name, p.product_type, p.price_rrc, p.brand,
           COALESCE(
             (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position ASC LIMIT 1),
             NULL
           ) AS image_url
    FROM home_hits h
    JOIN products p ON p.id = h.product_id
    ORDER BY h.position ASC, h.created_at ASC
  `;
}

/** Добавить товар в конец списка; список уже из 20 — отказ */
export async function addHomeHit(productId: string) {
  await ensureTable();
  const [row] = await sql`SELECT COUNT(*) AS n FROM home_hits`;
  if (Number(row.n) >= HOME_HITS_MAX) {
    throw new Error(`Лимит списка — ${HOME_HITS_MAX} товаров. Убери лишний, чтобы добавить новый.`);
  }
  const [next] = await sql`SELECT COALESCE(MAX(position) + 1, 0) AS pos FROM home_hits`;
  try {
    await sql`INSERT INTO home_hits (product_id, position) VALUES (${productId}, ${next.pos})`;
  } catch (e: any) {
    // 23505 — PRIMARY KEY (product_id): товар уже в списке
    if (e?.code === '23505') throw new Error('Этот товар уже есть в списке');
    throw e;
  }
}

/**
 * Переставить товар (direction: up/down) и перенумеровать позиции 0..n-1 —
 * так у позиций не копятся дыры после удалений
 */
export async function moveHomeHit(productId: string, direction: 'up' | 'down') {
  await ensureTable();
  const ids = await sql`SELECT product_id FROM home_hits ORDER BY position ASC, created_at ASC`;
  const idx = ids.findIndex((r: any) => r.product_id === productId);
  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= ids.length) return;
  [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
  for (let i = 0; i < ids.length; i++) {
    await sql`UPDATE home_hits SET position = ${i} WHERE product_id = ${ids[i].product_id}`;
  }
}

export async function removeHomeHit(productId: string) {
  await ensureTable();
  await sql`DELETE FROM home_hits WHERE product_id = ${productId}`;
}

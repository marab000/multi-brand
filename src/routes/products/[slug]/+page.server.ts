import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/api';
import { sql } from '$lib/db';
import { applyMetaTemplate, formatPriceRub, getMetaTemplates } from '$lib/server/metaTemplates';

export const load: PageServerLoad = async ({ params, fetch }) => {
  // apiFetch бросает исключение при ошибке ответа — ловим и отдаём честный 404
  let product: any = null;
  try {
    product = await apiFetch(fetch, `/api/products/${params.slug}`);
  } catch {
    product = null;
  }

  if (!product || !product.name) {
    throw error(404, 'Product not found');
  }

  // Слаг имени мог измениться (обогащение названием) — старые ссылки 301 на актуальную
  if (product.slug && product.slug !== params.slug) {
    redirect(301, `/products/${product.slug}`);
  }

  // «С этим товаром покупают»: 4 товара той же категории с ценой и картинкой
  let alsoBought: any[] = [];
  try {
    alsoBought = await sql`
      SELECT p.id, p.name, p.product_type, p.price_rrc, p.price_ric, p.specs, p.stock,
             p.brand,
             COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.product_type = ${product.product_type}
        AND p.id <> ${product.id}
        AND p.price_rrc IS NOT NULL
        AND EXISTS (SELECT 1 FROM product_images x WHERE x.product_id = p.id)
      GROUP BY p.id
      ORDER BY random()
      LIMIT 4
    `;
  } catch {
    alsoBought = [];
  }

  // Мета-теги: шаблон из админки (seo → «Шаблоны»), без ручных записей для товаров
  const price = product.price_ric ?? product.price_rrc ?? null;
  const tpl = await getMetaTemplates();
  const metaTitle = applyMetaTemplate(tpl.product_title, {
    название: product.name,
    тип: product.product_type ?? '',
    бренд: product.brand?.name ?? '',
    цена: formatPriceRub(price)
  }).slice(0, 200);
  const metaDescription = applyMetaTemplate(tpl.product_description, {
    название: product.name,
    тип: product.product_type || product.name,
    бренд: product.brand?.name ?? '',
    цена: price != null ? formatPriceRub(price) : 'уточняйте'
  }).slice(0, 300);

  return { product, alsoBought, metaTitle, metaDescription };
};

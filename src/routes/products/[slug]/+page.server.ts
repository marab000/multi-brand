import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/api';
import { sql } from '$lib/db';
import { applyMetaTemplate, formatPriceRub, getMetaTemplates } from '$lib/server/metaTemplates';
import { DEFAULT_CART_DISCOUNT_PERCENT, DEFAULT_EXCLUDED_BRANDS } from '$lib/utils/pricing';

// ─── «С этим товаром покупают»: кросс-пары категорий ───
// Карта согласована с заказчиком (07.11.2026): варка↔духовка (плиты считаем
// варкой), вытяжка↔СВЧ, посудомойка→холодильник/морозильник,
// морозильник→стирка/сушка, стирка/сушка→холодильник; у холодильника исходящей
// пары нет — для него и для брендов вне карты действует прежняя логика
// (4 товара той же категории). Кросс-пара: сначала тот же бренд, что смотримый
// товар, добор — другими салонными брендами, остаток блока — прежняя логика.
const ALSO_BOUGHT_BRANDS = ['asko', 'franke', 'liebherr', 'korting'];

const ALSO_BOUGHT_GROUPS: Record<string, string[]> = {
  hob: [
    'Газовая поверхность',
    'Индукционная поверхность',
    'Стеклокерамическая поверхность',
    'Комбинированная поверхность',
    'Варочный центр',
    'Газовая плита',
    'Стеклокерамическая плита',
    'Комбинированная плита',
    'Индукционная плитка',
    'Индукционная плита'
  ],
  oven: ['Электрический духовой шкаф', 'Газовый духовой шкаф', 'Компактный духовой шкаф'],
  mw: ['Встраиваемая микроволновая печь', 'Отдельностоящая микроволновая печь'],
  dw: [
    'Встраиваемая посудомоечная машина',
    'Отдельностоящая посудомоечная машина',
    'Компактная встраиваемая посудомоечная машина',
    'Компактная отдельностоящая посудомоечная машина',
    'Стаканомоечная машина отдельностоящая'
  ],
  fridge: [
    'Двухкамерный холодильник отдельностоящий',
    'Двухкамерный холодильник встраиваемый',
    'Однокамерный холодильник отдельностоящий',
    'Однокамерный холодильник встраиваемый',
    'Холодильник Side-by-Side отдельностоящий',
    'Холодильник Side-by-Side встраиваемый',
    'Трехкамерные холодильники отдельностоящие',
    'Трехкамерный холодильник встраиваемый',
    'Многокамерный холодильник отдельностоящий'
  ],
  freezer: ['Морозильная камера встраиваемая', 'Морозильная камера отдельностоящая', 'Морозильный ларь'],
  wash: [
    'Стиральная машина с фронтальной загрузкой',
    'Стиральная машина с вертикальной загрузкой',
    'Стиральная машина встраиваемая',
    'Сушильная машина встраиваемая',
    'Стирально-сушильная машина отдельностоящая',
    'Стирально-сушильная машина встраиваемая'
  ]
};

const ALSO_BOUGHT_PAIRS: Record<string, string[]> = {
  hob: ['oven'],
  oven: ['hob'],
  hood: ['mw'],
  mw: ['hood'],
  dw: ['fridge', 'freezer'],
  freezer: ['wash'],
  wash: ['fridge']
};

/** Группа категории товара; вытяжки матчатся по префиксу, остальные — по списку */
function alsoBoughtGroup(productType: unknown): string | null {
  const t = String(productType ?? '')
    .trim()
    .toLowerCase();
  if (!t) return null;
  if (t.startsWith('вытяжка')) return 'hood';
  for (const [group, types] of Object.entries(ALSO_BOUGHT_GROUPS)) {
    if (types.some((x) => x.toLowerCase() === t)) return group;
  }
  return null;
}

/** Карточки блока: цена и картинка обязательны, случайный порядок */
async function fetchAlsoBought(product: any, extra: any, limit: number): Promise<any[]> {
  return sql`
    SELECT p.id, p.name, p.product_type, p.price_rrc, p.price_ric, p.specs, p.stock,
           p.brand,
           COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE p.id <> ${product.id}
      AND p.price_rrc IS NOT NULL
      AND EXISTS (SELECT 1 FROM product_images x WHERE x.product_id = p.id)
      ${extra}
    GROUP BY p.id
    ORDER BY random()
    LIMIT ${limit}
  `;
}

async function pickAlsoBought(product: any): Promise<any[]> {
  const type = String(product.product_type ?? '')
    .trim()
    .toLowerCase();
  if (!type) return [];
  const sameType = sql`AND LOWER(TRIM(p.product_type)) = ${type}`;

  const brand = String(product.brand?.name ?? '')
    .trim()
    .toLowerCase();
  const group = alsoBoughtGroup(product.product_type);
  const targets = ALSO_BOUGHT_BRANDS.includes(brand) && group ? ALSO_BOUGHT_PAIRS[group] : undefined;
  // бренд вне карты или у группы нет исходящей пары — прежняя логика целиком
  if (!targets) return fetchAlsoBought(product, sameType, 4);

  const targetCondition = (g: string) =>
    g === 'hood'
      ? sql`LOWER(TRIM(p.product_type)) LIKE 'вытяжка%'`
      : sql`LOWER(TRIM(p.product_type)) IN ${sql(ALSO_BOUGHT_GROUPS[g].map((t) => t.toLowerCase()))}`;
  const targetCond =
    targets.length === 1
      ? targetCondition(targets[0])
      : sql`(${targetCondition(targets[0])} OR ${targetCondition(targets[1])})`;
  // пустой список исключений = пустой фрагмент: sql([]) сломал бы IN ()
  const notPicked = (list: any[]) =>
    list.length ? sql`AND p.id::text NOT IN ${sql(list.map((p) => String(p.id)))}` : sql``;

  // 1) парная категория, тот же бренд, что смотримый товар
  const out: any[] = await fetchAlsoBought(
    product,
    sql`AND (${targetCond}) AND LOWER(TRIM(p.brand->>'name')) = ${brand}`,
    4
  );
  // 2) не хватило — парная категория, другие салонные бренды
  if (out.length < 4) {
    out.push(
      ...(await fetchAlsoBought(
        product,
        sql`AND (${targetCond}) AND LOWER(TRIM(p.brand->>'name')) <> ${brand}
            AND LOWER(TRIM(p.brand->>'name')) IN ${sql(ALSO_BOUGHT_BRANDS)} ${notPicked(out)}`,
        4 - out.length
      ))
    );
  }
  // 3) остальное добиваем прежней логикой: та же категория, что смотримый товар
  if (out.length < 4) {
    out.push(...(await fetchAlsoBought(product, sql`${sameType} ${notPicked(out)}`, 4 - out.length)));
  }
  return out;
}

export const load: PageServerLoad = async ({ params, fetch, locals }) => {
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

  // «С этим товаром покупают»: кросс-пары для салонных брендов (см. pickAlsoBought),
  // остальное — 4 товара той же категории с ценой и картинкой
  let alsoBought: any[] = [];
  try {
    alsoBought = await pickAlsoBought(product);
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

  // Бонус (как в корзине): процент списывается баллами, на исключённые бренды не начисляется
  let bonusPercent = DEFAULT_CART_DISCOUNT_PERCENT;
  let excludedBrands: string[] = DEFAULT_EXCLUDED_BRANDS;
  try {
    const rows = await sql`SELECT key, value FROM settings WHERE key IN ('cart_discount_percent', 'excluded_brands')`;
    for (const row of rows) {
      if (row.key === 'cart_discount_percent') bonusPercent = Number(row.value) || 0;
      if (row.key === 'excluded_brands') {
        try {
          excludedBrands = JSON.parse(row.value);
        } catch {
          // оставляем дефолт
        }
      }
    }
  } catch {
    // таблицы нет — дефолт
  }

  return { product, alsoBought, metaTitle, metaDescription, city: locals.city, bonusPercent, excludedBrands };
};

import { sql } from '$lib/db';
import { fetchProducts } from '$lib/server/catalogApi';
import { SLOT_TYPES, SLOT_LABELS } from '$lib/podborSlots';
import type { Product } from '$lib/types/product';

export type BundleTier = 1 | 2 | 3 | 4;

/** Уровень бюджета → перцентиль цены внутри каждой категории.
 *  Тир означает «насколько дорогие модели брать в каждой категории»,
 *  поэтому невыполнимых комбинаций категорий не существует. */
export const TIER_PERCENTILE: Record<BundleTier, number> = {
  1: 0.2,
  2: 0.4,
  3: 0.6,
  4: 0.8
};

export interface BundleRequest {
  /** Выбранные слоты конструктора */
  types: Record<string, boolean>;
  /** Уровень бюджета (тир) */
  tier: BundleTier;
  /** Бренды, выбранные клиентом (сегмент) */
  brands: string[];
  /** Цвет или null = не важно */
  color: string | null;
}

export interface BundlePick {
  slot: string;
  label: string;
  chosen: Product | null;
  alternatives: Product[];
  /** true = в категории не нашлось под цвет/бренд — показали ближайшее без фильтров */
  fallback?: boolean;
}

/** Конфиг викторины из settings (расширяемый) */
export interface PodborConfig {
  version: number;
  brands: { mode: 'all' | 'whitelist' | 'blacklist'; whitelist: string[]; blacklist: string[] };
  priorityProducts: string[];
  /** Бренды, на которые бонус/скидка комплекта не начисляется */
  bonusExcludedBrands: string[];
  /** Сегменты брендов для шага «Выберите бренд» (из ТЗ) */
  brandSegments: { budget: string[]; medium: string[]; premium: string[] };
  texts: Record<string, string>;
}

export const DEFAULT_BRAND_SEGMENTS = {
  // «Оптимальный» — средний ценовой сегмент (ключ budget исторический)
  budget: ['KORTING', 'DeLonghi', 'Kuppersberg', 'Haier', 'GORENJE', 'BOSCH'],
  // «Средний» больше не показывается: сегментов два — Оптимальный и Премиум
  medium: [],
  premium: ['Franke', 'ASKO', 'AEG', 'SMEG', 'ELICA', 'MIELE', 'KUPPERSBUSCH', 'LIEBHERR']
};

// Бренды, которые показываем в первую очередь при прочих равных
export const PRIORITY_BRANDS = ['korting', 'asko', 'franke', 'delonghi'];

export const DEFAULT_PODBOR_CONFIG: PodborConfig = {
  version: 1,
  brands: { mode: 'all', whitelist: [], blacklist: [] },
  priorityProducts: [],
  bonusExcludedBrands: [],
  brandSegments: DEFAULT_BRAND_SEGMENTS,
  texts: {}
};

export async function loadPodborConfig(): Promise<PodborConfig> {
  try {
    const rows = await sql`SELECT value FROM settings WHERE key = 'podbor_config'`;
    if (!rows.length) return DEFAULT_PODBOR_CONFIG;
    const parsed = JSON.parse(rows[0].value);
    return {
      version: 1,
      brands: {
        mode: ['all', 'whitelist', 'blacklist'].includes(parsed?.brands?.mode)
          ? parsed.brands.mode
          : 'all',
        whitelist: Array.isArray(parsed?.brands?.whitelist) ? parsed.brands.whitelist : [],
        blacklist: Array.isArray(parsed?.brands?.blacklist) ? parsed.brands.blacklist : []
      },
      priorityProducts: Array.isArray(parsed?.priorityProducts)
        ? parsed.priorityProducts.map(String)
        : [],
      bonusExcludedBrands: Array.isArray(parsed?.bonusExcludedBrands)
        ? parsed.bonusExcludedBrands.map(String)
        : [],
      brandSegments: {
        budget: Array.isArray(parsed?.brandSegments?.budget) ? parsed.brandSegments.budget : DEFAULT_BRAND_SEGMENTS.budget,
        medium: Array.isArray(parsed?.brandSegments?.medium) ? parsed.brandSegments.medium : DEFAULT_BRAND_SEGMENTS.medium,
        premium: Array.isArray(parsed?.brandSegments?.premium) ? parsed.brandSegments.premium : DEFAULT_BRAND_SEGMENTS.premium
      },
      texts:
        parsed?.texts && typeof parsed.texts === 'object' && !Array.isArray(parsed.texts)
          ? parsed.texts
          : {}
    };
  } catch {
    return DEFAULT_PODBOR_CONFIG;
  }
}

import { type PodborSlot } from '$lib/podborSlots';

export type SlotKey = PodborSlot;

/** Определяет слот по product_type (для админки) */
export function slotOfProduct(productType: string | null | undefined): SlotKey | null {
  if (!productType) return null;
  const t = productType.trim().toLowerCase();
  for (const slot of Object.keys(SLOT_TYPES) as SlotKey[]) {
    if ((SLOT_TYPES[slot] as readonly string[]).some((s) => s.toLowerCase() === t)) return slot;
  }
  return null;
}



// Цвета в specs могут быть записаны по-разному — пробуем все варианты написания
const COLOR_ALIASES: Record<string, string[]> = {
  'Чёрный': ['чёрный', 'черный', 'black'],
  'Белый': ['белый', 'white'],
  'Серебристый': ['серебристый', 'серебро', 'нержавеющая сталь', 'нержавейка', 'silver'],
  'Бежевый': ['бежевый', 'кремовый']
};

function colorCandidates(color: string): string[] {
  const key =
    Object.keys(COLOR_ALIASES).find((k) => k.toLowerCase() === color.trim().toLowerCase()) ??
    color;
  // цвет может не входить в справочник — тогда только само значение
  return [key.toLowerCase(), ...(COLOR_ALIASES[key]?.map((c) => c.toLowerCase()) ?? [])];
}

function displayPrice(p: Product): number | null {
  const base = p.price_rrc ?? p.price_ric ?? null;
  return base == null ? null : Math.round(base * 1000);
}

/** Товар участвует в подборе только с реальной ненулевой ценой */
function hasPrice(p: Product): boolean {
  const v = displayPrice(p);
  return v != null && v > 0;
}

/** Перцентили цен слота (в тысячах, как в БД) — только товары с ненулевой ценой */
export async function fetchSlotPercentiles(slot: SlotKey) {
  const rows = await sql`
    SELECT
      percentile_cont(0.2) WITHIN GROUP (ORDER BY price_rrc) AS p20,
      percentile_cont(0.4) WITHIN GROUP (ORDER BY price_rrc) AS p40,
      percentile_cont(0.6) WITHIN GROUP (ORDER BY price_rrc) AS p60,
      percentile_cont(0.8) WITHIN GROUP (ORDER BY price_rrc) AS p80
    FROM products
    WHERE price_rrc > 0
      AND LOWER(TRIM(product_type)) IN ${sql([...SLOT_TYPES[slot]].map((t) => t.toLowerCase()))}
  `;
  const r = rows[0] ?? {};
  return {
    p20: Number(r.p20 ?? 0),
    p40: Number(r.p40 ?? 0),
    p60: Number(r.p60 ?? 0),
    p80: Number(r.p80 ?? 0)
  };
}

function colorOf(p: Product): string | null {
  const c = (p.specs as any)?.['Цвет'];
  return c ? String(c).trim().toLowerCase() : null;
}

/** Приоритетные товары слота, отсортированные: сначала подходящие под фильтры.
 *  Цвет строгий: при выбранном цвете неподходящие товары отсеиваются совсем. */
function rankPriority(products: Product[], req: BundleRequest): Product[] {
  const colorSet = req.color ? new Set(colorCandidates(req.color)) : null;
  const filtered = colorSet
    ? products.filter((p) => {
        const c = colorOf(p);
        return c != null && colorSet.has(c);
      })
    : products;
  return [...filtered].sort((a, b) => score(b) - score(a));
  function score(p: Product): number {
    let s = 0;
    if (displayPrice(p) != null) s += 1;
    return s;
  }
}

/** Товары по списку id, относящиеся к слоту */
async function fetchPriorityForSlot(slot: SlotKey, ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  try {
    const rows = await sql`
      SELECT p.*, COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL),'[]') AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.id::text IN ${sql(ids)}
        AND LOWER(TRIM(p.product_type)) IN ${sql([...SLOT_TYPES[slot]].map((t) => t.toLowerCase()))}
      GROUP BY p.id
    `;
    return rows as any[];
  } catch {
    return [];
  }
}

function brandFilters(cfg: PodborConfig): { brands?: string[]; excludedBrands?: string[] } {
  if (cfg.brands.mode === 'whitelist' && cfg.brands.whitelist.length) {
    return { brands: cfg.brands.whitelist };
  }
  if (cfg.brands.mode === 'blacklist' && cfg.brands.blacklist.length) {
    return { excludedBrands: cfg.brands.blacklist };
  }
  return {};
}

/**
 * Подбирает товар для слота: приоритетные товары из конфига идут первыми,
 * затем обычный поиск со ступенчатым ослаблением фильтров
 * (цвет+ширина+цена → без цены → без ширины → только цвет → без фильтров).
 */
async function pickForSlot(
  slot: SlotKey,
  req: BundleRequest,
  cfg: PodborConfig,
  priorityIds: Set<string>,
  percentiles: { p20: number; p40: number; p60: number; p80: number }
): Promise<BundlePick> {
  // Целевая цена слота = перцентиль распределения цен этой категории,
  // соответствующий уровню бюджета (тиру). Слоты не зависят друг от друга,
  // поэтому невыполнимых комбинаций категорий не бывает.
  const targetDb = percentiles[TIER_PERCENTILE[req.tier] === 0.2 ? 'p20' : TIER_PERCENTILE[req.tier] === 0.4 ? 'p40' : TIER_PERCENTILE[req.tier] === 0.6 ? 'p60' : 'p80'];
  const targetRub = Math.round(targetDb * 1000);

  const priceMaxDb = targetDb * 1.45; // потолок вокруг цели
  const priceMinDb = targetDb * 0.65; // не предлагаем совсем дешёвые, если бюджет позволяет
  const colors = req.color ? colorCandidates(req.color) : undefined;
  // бренды: выбранные клиентом пересекаются с пулом админки
  const cfgBf = brandFilters(cfg);
  let brandFilter: { brands?: string[]; excludedBrands?: string[] } = {};
  if (req.brands.length) {
    let list = req.brands;
    if (cfgBf.brands?.length) {
      const pool = new Set(cfgBf.brands.map((b) => b.toLowerCase()));
      list = list.filter((b) => pool.has(b.toLowerCase()));
    }
    if (cfgBf.excludedBrands?.length) {
      const excl = new Set(cfgBf.excludedBrands.map((b) => b.toLowerCase()));
      list = list.filter((b) => !excl.has(b.toLowerCase()));
    }
    if (list.length) brandFilter = { brands: list };
    else brandFilter = cfgBf;
  } else {
    brandFilter = cfgBf;
  }

  // Ослабляем фильтры постепенно: сначала цвет и нижняя граница цены,
  // потолок бюджета соблюдается всегда
  // цвет строгий во всех попытках — «заменить» тоже предлагаем только в выбранном цвете
  const attempts: Array<{ colors?: string[]; priceMin?: number; priceMax?: number }> = [
    { colors, ...brandFilter, priceMin: priceMinDb, priceMax: priceMaxDb },
    { colors, ...brandFilter, priceMax: priceMaxDb },
    { colors, ...brandFilter, priceMax: targetDb * 2.6 },
    { colors, ...brandFilter }
  ];

  // Приоритетные товары слота
  const prioWindowMin = targetRub * 0.6;
  const prioWindowMax = targetRub * 1.7;
  const priority = rankPriority(
    (await fetchPriorityForSlot(slot, [...priorityIds])).filter(
      (p: any) => {
        const v = displayPrice(p);
        return v != null && v > 0 && v >= prioWindowMin && v <= prioWindowMax;
      }
    ),
    req
  );

  const fetchRegular = async (): Promise<{ list: Product[]; degraded: boolean }> => {
    for (const attempt of attempts) {
      const { products } = await fetchProducts(
        {
          types: [...SLOT_TYPES[slot]],
          sort: 'price_asc',
          ...attempt
        },
        12
      );
      const regular = (products as unknown as Product[]).filter(hasPrice);
      // товары без фото — только если с фото пусто: карточка слота не должна быть пустой
      const withPhotos = regular.filter((p) => Array.isArray(p.images) && p.images.length);
      if (withPhotos.length) return { list: withPhotos, degraded: false };
      if (regular.length) return { list: regular, degraded: false };
    }
    // Последний рубеж: товар удалили, цвет редкий или бренд-призрак — слот не должен
    // исчезать из результата. Отдаём ближайшее без фильтров, пик помечается fallback.
    if (colors || brandFilter.brands?.length || brandFilter.excludedBrands?.length) {
      const { products } = await fetchProducts(
        { types: [...SLOT_TYPES[slot]], sort: 'price_asc' },
        12
      );
      const bare = (products as unknown as Product[]).filter(hasPrice);
      const barePhotos = bare.filter((p) => Array.isArray(p.images) && p.images.length);
      if (barePhotos.length) return { list: barePhotos, degraded: true };
      if (bare.length) return { list: bare, degraded: true };
    }
    return { list: [], degraded: false };
  };

  // Если для слота заданы приоритетные товары — выбранный берём из них,
  // а в «заменить» добираем похожие из каталога, чтобы выбор был не из одного
  if (priority.length) {
    const chosen = priority[0];
    const alternatives = priority.slice(0, 3);
    if (alternatives.length < 3) {
      const seen = new Set(alternatives.map((p) => String(p.id)));
      seen.add(String(chosen.id));
      for (const p of (await fetchRegular()).list) {
        if (alternatives.length >= 3) break;
        const id = String(p.id);
        if (seen.has(id)) continue;
        seen.add(id);
        alternatives.push(p);
      }
    }
    return {
      slot,
      label: SLOT_LABELS[slot],
      chosen,
      alternatives
    };
  }
  // Приоритетных для слота нет — добираем из каталога с учётом блока «Бренды».
  // Приоритетные и автодобор дополняют друг друга, а не исключают: блок брендов
  // задаёт пул для категорий, которые администратор не заполнил вручную.
  const { list: regular, degraded } = await fetchRegular();

  // Собираем: приоритетные сначала, затем обычные без дублей, максимум 4 альтернативы
  const seen = new Set<string>();
  const merged: Product[] = [];
  for (const p of [...priority, ...regular]) {
    const id = String(p.id);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(p);
  }

  // Не самый дешёвый, а ближайший к доле бюджета; приоритетным брендам —
  // скидка 20% к дистанции, чтобы при равных условиях они поднимались выше
  const brandName = (p: Product) =>
    String((p.brand as any)?.name ?? p.brand ?? '').toLowerCase().trim();
  const brandBoost = (p: Product) =>
    PRIORITY_BRANDS.includes(brandName(p)) ? 0.8 : 1;
  const byCloseness = [...merged].sort(
    (a, b) =>
      Math.abs((displayPrice(a) ?? 0) - targetRub) * brandBoost(a) -
      Math.abs((displayPrice(b) ?? 0) - targetRub) * brandBoost(b)
  );

  // Приоритетных для слота нет — fallback на обычный подбор (только он и попадёт в выдачу)
  const chosen = byCloseness[0] ?? null;
  const alternatives = [chosen, ...byCloseness.filter((p) => p !== chosen)]
    .slice(0, 3)
    .filter(Boolean);
  return {
    slot,
    label: SLOT_LABELS[slot],
    chosen,
    alternatives,
    fallback: degraded && chosen != null
  };
}

// Комплект одного бренда лучше солянки: если какой-то бренд есть в альтернативах
// большинства слотов — подтягиваем его в выбранные этих слотов
function preferSameBrand(picks: BundlePick[]): BundlePick[] {
  if (picks.length < 2) return picks;
  const brandOf = (p: Product | null) =>
    String(((p ?? {}) as any).brand?.name ?? p?.brand ?? '').toLowerCase().trim();
  const coverage = new Map<string, number>();
  for (const pick of picks) {
    for (const b of new Set([pick.chosen, ...pick.alternatives].map(brandOf))) {
      coverage.set(b, (coverage.get(b) ?? 0) + 1);
    }
  }
  const best = [...coverage.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!best) return picks;
  return picks.map((pick) => {
    if (!pick.chosen || brandOf(pick.chosen) === best) return pick;
    const sameBrand = pick.alternatives.find((p) => brandOf(p) === best);
    if (!sameBrand) return pick;
    return {
      ...pick,
      chosen: sameBrand,
      alternatives: [sameBrand, ...pick.alternatives.filter((p) => p.id !== sameBrand.id)]
    };
  });
}

export async function pickBundle(req: BundleRequest): Promise<BundlePick[]> {
  const cfg = await loadPodborConfig();
  const priorityIds = new Set(cfg.priorityProducts.map(String));
  const slots = (Object.keys(req.types) as SlotKey[]).filter((k) => req.types[k]);
  const percentileList = await Promise.all(slots.map((slot) => fetchSlotPercentiles(slot)));
  const picks = await Promise.all(
    slots.map((slot, i) => pickForSlot(slot, req, cfg, priorityIds, percentileList[i]))
  );
  return preferSameBrand(picks.filter((p) => p.chosen != null));
}

export { displayPrice };

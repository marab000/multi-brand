import { sql } from '$lib/db';
import { fetchProducts } from '$lib/server/catalogApi';
import { SLOT_TYPES, SLOT_LABELS } from '$lib/podborSlots';
import type { Product } from '$lib/types/product';

export interface BundleSlotOptions {
  /** Включён ли пункт в подбор */
  hob: boolean;
  oven: boolean;
  hood: boolean;
  dishwasher: boolean;
}

export interface BundleRequest {
  types: BundleSlotOptions;
  /** Полный бюджет комплекта в рублях (display) */
  budget: number;
  /** Ширина ниши в см (45 / 60 / 90) */
  width: number | null;
  /** Цвет или null = не важно */
  color: string | null;
}

export interface BundlePick {
  slot: string;
  label: string;
  chosen: Product | null;
  alternatives: Product[];
}

/** Конфиг викторины из settings (расширяемый) */
export interface PodborConfig {
  version: number;
  brands: { mode: 'all' | 'whitelist' | 'blacklist'; whitelist: string[]; blacklist: string[] };
  priorityProducts: string[];
  texts: Record<string, string>;
}

export const DEFAULT_PODBOR_CONFIG: PodborConfig = {
  version: 1,
  brands: { mode: 'all', whitelist: [], blacklist: [] },
  priorityProducts: [],
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
      texts:
        parsed?.texts && typeof parsed.texts === 'object' && !Array.isArray(parsed.texts)
          ? parsed.texts
          : {}
    };
  } catch {
    return DEFAULT_PODBOR_CONFIG;
  }
}

export type SlotKey = keyof BundleSlotOptions;

/** Определяет слот по product_type (для админки) */
export function slotOfProduct(productType: string | null | undefined): SlotKey | null {
  if (!productType) return null;
  const t = productType.trim().toLowerCase();
  for (const slot of Object.keys(SLOT_TYPES) as SlotKey[]) {
    if ((SLOT_TYPES[slot] as readonly string[]).some((s) => s.toLowerCase() === t)) return slot;
  }
  return null;
}

// Доли бюджета на слот (сумма = 1)
const SLOT_SHARE: Record<SlotKey, number> = {
  hob: 0.25,
  oven: 0.35,
  hood: 0.15,
  dishwasher: 0.25
};

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

function widthOf(p: Product): number | null {
  const specs: any = p.specs ?? {};
  for (const k of ['Размер (Ширина)', 'Размер (Ширина), см', 'Ширина прибора']) {
    const raw = specs[k];
    if (raw == null) continue;
    const m = String(raw).replace(',', '.').match(/\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return null;
}

function colorOf(p: Product): string | null {
  const c = (p.specs as any)?.['Цвет'];
  return c ? String(c).trim().toLowerCase() : null;
}

/** Приоритетные товары слота, отсортированные: сначала подходящие под фильтры */
function rankPriority(products: Product[], req: BundleRequest): Product[] {
  const colorSet = req.color ? new Set(colorCandidates(req.color)) : null;
  return [...products].sort((a, b) => score(b) - score(a));
  function score(p: Product): number {
    let s = 0;
    if (displayPrice(p) != null) s += 1;
    if (!colorSet || (colorOf(p) && colorSet.has(colorOf(p)!))) s += 2;
    if (req.width) {
      const w = widthOf(p);
      if (w != null && Math.abs(w - req.width) <= 2) s += 4;
    }
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
      WHERE p.id = ANY(${sql.array(ids)}::uuid[])
        AND LOWER(TRIM(p.product_type)) = ANY(${sql.array([...SLOT_TYPES[slot]].map((t) => t.toLowerCase()))}::text[])
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
  priorityIds: Set<string>
): Promise<BundlePick> {
  // Нормируем доли бюджета на выбранные слоты
  const activeSlots = (Object.keys(req.types) as SlotKey[]).filter((k) => req.types[k]);
  const totalShare = activeSlots.reduce((s, k) => s + SLOT_SHARE[k], 0);
  const budgetPart = totalShare > 0 ? (req.budget * SLOT_SHARE[slot]) / totalShare : req.budget;

  const priceMaxDb = (budgetPart / 1000) * 1.4; // запас 40% сверху, цены в БД в тысячах
  // нижняя граница — не предлагаем совсем дешёвые, если бюджет позволяет
  const priceMinDb = (budgetPart / 1000) * 0.55;
  const widthTolerance = req.width ? { width: { min: req.width - 2, max: req.width + 2 } } : null;
  const colors = req.color ? colorCandidates(req.color) : undefined;

  // Ослабляем фильтры постепенно, но без «дна»: ширина держится до последнего,
  // потолок бюджета соблюдается всегда — товары не по габаритам/бюджету не показываем
  const attempts: Array<{ colors?: string[]; specs?: any; priceMin?: number; priceMax?: number }> = [
    { colors, specs: widthTolerance, priceMin: priceMinDb, priceMax: priceMaxDb },
    { colors, specs: widthTolerance, priceMax: priceMaxDb },
    { specs: widthTolerance, priceMin: priceMinDb, priceMax: priceMaxDb },
    { specs: widthTolerance, priceMax: priceMaxDb },
    { priceMax: priceMaxDb }
  ];

  // Приоритетные товары слота
  const priority = rankPriority(
    (await fetchPriorityForSlot(slot, [...priorityIds])).filter((p: any) => displayPrice(p) != null),
    req
  );

  const bf = brandFilters(cfg);
  const fetchRegular = async (): Promise<Product[]> => {
    for (const attempt of attempts) {
      const { products } = await fetchProducts(
        {
          types: [...SLOT_TYPES[slot]],
          sort: 'price_asc',
          ...bf,
          ...attempt
        },
        12
      );
      const regular = (products as unknown as Product[]).filter((p: any) => displayPrice(p) != null);
      if (regular.length) return regular;
    }
    return [];
  };

  // Если для слота заданы приоритетные товары — выбранный берём из них,
  // а в «заменить» добираем похожие из каталога, чтобы выбор был не из одного
  if (priority.length) {
    const chosen = priority[0];
    const alternatives = priority.slice(0, 4);
    if (alternatives.length < 3) {
      const seen = new Set(alternatives.map((p) => String(p.id)));
      seen.add(String(chosen.id));
      for (const p of await fetchRegular()) {
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
  const regular = await fetchRegular();

  // Собираем: приоритетные сначала, затем обычные без дублей, максимум 4 альтернативы
  const seen = new Set<string>();
  const merged: Product[] = [];
  for (const p of [...priority, ...regular]) {
    const id = String(p.id);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(p);
  }

  // Не самый дешёвый, а ближайший к доле бюджета (приоритетные — без пересборки)
  const byCloseness = [...merged].sort(
    (a, b) =>
      Math.abs((displayPrice(a) ?? 0) - budgetPart) - Math.abs((displayPrice(b) ?? 0) - budgetPart)
  );

  // Приоритетных для слота нет — fallback на обычный подбор (только он и попадёт в выдачу)
  const chosen = byCloseness[0] ?? null;
  const alternatives = [chosen, ...byCloseness.filter((p) => p !== chosen)]
    .slice(0, 4)
    .filter(Boolean);
  return {
    slot,
    label: SLOT_LABELS[slot],
    chosen,
    alternatives
  };
}

export async function pickBundle(req: BundleRequest): Promise<BundlePick[]> {
  const cfg = await loadPodborConfig();
  const priorityIds = new Set(cfg.priorityProducts.map(String));
  const slots = (Object.keys(req.types) as SlotKey[]).filter((k) => req.types[k]);
  const picks = await Promise.all(slots.map((slot) => pickForSlot(slot, req, cfg, priorityIds)));
  return picks.filter((p) => p.chosen != null);
}

export { displayPrice };

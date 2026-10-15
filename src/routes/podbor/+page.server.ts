import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { fetchProducts } from '$lib/server/catalogApi';
import { loadPodborConfig } from '$lib/server/bundlePicker';
import { getSeoOverride, safeCanonical } from '$lib/server/seoOverrides';
import { SLOT_TYPES } from '$lib/podborSlots';
import sharp from 'sharp';

// Фото-шаги для ВСЕХ слотов конструктора — типы берём из podborSlots (один источник)
const SLOT_IMAGES_TYPES: Record<string, string[]> = SLOT_TYPES as unknown as Record<
  string,
  string[]
>;

// Фото-шаги конструктора: ЗАФИКСИРОВАННЫЕ — генерируются один раз (чёрные товары,
// горизонтальные фото с близким аспектом), хранятся в settings и всегда одинаковые.
// Выбор карточки в списке больше не зависит от рандома.
const SLOT_IMAGES_KEY = 'podbor_slot_images_fixed';

async function measureAspect(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    if (!meta.width || !meta.height) return null;
    return meta.width / meta.height;
  } catch {
    return null;
  }
}

// у каждой картинки свой аспект — для карточек нужен горизонтальный ~4:3
const isGoodPreviewAspect = (a: number) => a >= 1.1 && a <= 1.9;

async function pickBestPhoto(products: any[]): Promise<string | null> {
  const withImages = products.filter((p: any) => p.images?.[0]?.url);
  if (!withImages.length) return null;
  // приоритет чёрным
  const black = withImages.filter((p: any) =>
    `${p.name} ${JSON.stringify(p.specs ?? '')}`.toLowerCase().includes('черн')
  );
  const pool = (black.length ? black : withImages).slice(0, 6);
  const measured: { url: string; aspect: number }[] = [];
  for (const p of pool) {
    const url = p.images[0].url;
    const aspect = await measureAspect(url);
    if (aspect != null && isGoodPreviewAspect(aspect)) measured.push({ url, aspect });
  }
  if (!measured.length) return pool[0]?.images?.[0]?.url ?? null;
  const aspects = measured.map((m) => m.aspect).sort((a, b) => a - b);
  const median = aspects[Math.floor(aspects.length / 2)];
  return measured.sort((a, b) => Math.abs(a.aspect - median) - Math.abs(b.aspect - median))[0].url;
}

async function buildFixedSlotImages(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [slot, types] of Object.entries(SLOT_IMAGES_TYPES)) {
    try {
      const { products } = await fetchProducts({ types, sort: 'price_desc' }, 16);
      const url = await pickBestPhoto(products as any[]);
      if (url) result[slot] = url;
    } catch {}
  }
  return result;
}

async function getFixedSlotImages(): Promise<Record<string, string>> {
  try {
    const rows = await sql`
      select value from settings where key = ${SLOT_IMAGES_KEY} limit 1`;
    if (rows.length) {
      const parsed = JSON.parse(rows[0].value);
      if (parsed?.slots && Object.keys(parsed.slots).length >= 10) return parsed.slots;
    }
    const slots = await buildFixedSlotImages();
    if (Object.keys(slots).length >= 10) {
      const payload = JSON.stringify({ updated_at: new Date().toISOString(), slots });
      await sql`
        insert into settings (key, value, updated_at)
        values (${SLOT_IMAGES_KEY}, ${payload}, now())
        on conflict (key) do update set value = ${payload}, updated_at = now()`;
      return slots;
    }
  } catch {}
  return {};
}

export const load: PageServerLoad = async () => {
  const cfg = await loadPodborConfig();
  try {
    const slotImages = await getFixedSlotImages();
    // hero — фикс-фото вытяжки
    const heroImage = slotImages.hood ?? null;
    // Сегменты брендов показываем только с живым пулом: бренд удалён или пуст —
    // кнопка из викторины исчезает сама, ничего не ломается от состава товаров.
    // Плюс уважаем конфиг админки: whitelist/blacklist брендов викторины.
    const allSlotTypes = Object.values(SLOT_TYPES).flat().map((t) => t.toLowerCase());
    const poolRows = await sql`
      SELECT DISTINCT LOWER(TRIM(brand->>'name')) AS b
      FROM products
      WHERE price_rrc > 0 AND LOWER(TRIM(product_type)) IN ${sql(allSlotTypes)}
    `;
    const liveBrands = new Set(poolRows.map((r: any) => r.b).filter(Boolean));
    const wl =
      cfg.brands.mode === 'whitelist' && cfg.brands.whitelist.length
        ? new Set(cfg.brands.whitelist.map((b) => b.toLowerCase()))
        : null;
    const bl =
      cfg.brands.mode === 'blacklist' && cfg.brands.blacklist.length
        ? new Set(cfg.brands.blacklist.map((b) => b.toLowerCase()))
        : null;
    const allowed = (b: string) => {
      const lb = b.toLowerCase();
      if (!liveBrands.has(lb)) return false;
      if (wl && !wl.has(lb)) return false;
      if (bl && bl.has(lb)) return false;
      return true;
    };
    const seg = cfg.brandSegments;
    const brandSegments = {
      budget: seg.budget.filter(allowed),
      medium: seg.medium.filter(allowed),
      premium: seg.premium.filter(allowed)
    };
    const seoO = await getSeoOverride('podbor');
    return {
      heroImage,
      slotImages,
      brandSegments,
      meta: {
        title: seoO?.title || 'Собери комплект техники — подбор за 1 минуту | Мультибренд Казань (MultiBrand)',
        description: seoO?.description || undefined,
        canonical: seoO?.canonical ? safeCanonical(seoO.canonical) : safeCanonical('/podbor')
      }
    };
  } catch {
    return { heroImage: null, slotImages: {}, brandSegments: null, meta: null };
  }
};

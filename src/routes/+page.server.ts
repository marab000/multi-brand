import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { getBrandConfig } from '$lib/server/tetrasis';
import { getSeoOverride, safeCanonical } from '$lib/server/seoOverrides';
import { replaceCityPlaceholders } from '$lib/server/cityPlaceholders';

export const load: PageServerLoad = async ({ fetch, locals }) => {
  try {
    const res = await fetch('/api/slides');
    const data = await res.json();

    // Бренды для блока на главной — из включённых в синке (админка → «Тетрис»)
    let syncBrands: string[] = [];
    try {
      syncBrands = (await getBrandConfig()).enabled.slice().sort((a, b) => a.localeCompare(b, 'ru'));
    } catch {
      // настроек ещё нет — блок просто не покажется
    }

    // фото промо-блока Omoikiri — статичные ассеты (omoikiri-*.webp), тут только счётчики
    // моделей для бейджей «от N моделей»

    let omoikiriCounts: { moiki: number; smesiteli: number; izmelchiteli: number } | null = null;
    try {
      const countRows = await sql`
        select p.catalog_root_slug as slug, count(*)::int as c
        from products p
        where p.brand->>'name' = 'Omoikiri'
          and p.catalog_root_slug in ('kuhonnye-moyki', 'smesiteli', 'izmelchiteli-pischevyh-othodov')
          and p.price_rrc is not null
        group by 1`;
      const bySlug = Object.fromEntries(countRows.map((r) => [r.slug, r.c as number]));
      omoikiriCounts = {
        moiki: bySlug['kuhonnye-moyki'] ?? 0,
        smesiteli: bySlug['smesiteli'] ?? 0,
        izmelchiteli: bySlug['izmelchiteli-pischevyh-othodov'] ?? 0
      };
    } catch {
      omoikiriCounts = null; // бейджи «от N моделей» просто не покажутся
    }

    // Хиты продаж: только Asko (стирки/сушки), Liebherr (холодильники/морозилки)
    // и Franke (духовки/варки/вытяжки/свч). Десять на десктоп (2 ряда по 5),
    // на мобилке лишние прячет CSS. Бакеты по брендам с чередованием — чтобы
    // все три бренда гарантированно были в секции, внутри бакета случайный выбор.
    const HIT_COLUMNS = 5; // колонок на десктопе
    const HITS_TOTAL = HIT_COLUMNS * 2;
    const pickHits = (brand: string, groups: string[], limit: number) => sql`
      SELECT p.id, p.name, p.product_type, p.price_rrc, p.price_ric, p.specs,
             p.brand,
             COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.price_rrc IS NOT NULL
        AND EXISTS (SELECT 1 FROM product_images x WHERE x.product_id = p.id)
        AND p.product_type NOT ILIKE 'комплект%'
        AND p.brand->>'name' = ${brand}
        AND p.catalog_group_slug IN ${sql(groups)}
      GROUP BY p.id
      ORDER BY random()
      LIMIT ${limit}
    `;
    let hits: any[] = [];
    try {
      const [asko, liebherr, franke] = await Promise.all([
        pickHits('ASKO', ['stiralnye-i-sushilnye-mashiny'], 6),
        pickHits('LIEBHERR', ['holodilniki-i-morozilniki'], 6),
        pickHits('Franke', [
          'duhovye-shkafy',
          'varochnye-poverhnosti',
          'vytyazhki-vstraivaemye',
          'vytyazhki-otdelnostoyaschie',
          'mikrovolnovye-pechi'
        ], 6)
      ]);
      // чередуем бакеты: Asko, Liebherr, Franke, Asko, ...
      const pools = [asko, liebherr, franke].map((p) => [...p]);
      const seen = new Set<string>();
      for (let round = 0; hits.length < HITS_TOTAL && pools.some((p) => p.length); round++) {
        const pool = pools[round % pools.length];
        const item = pool.shift();
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          hits.push(item);
        }
      }
    } catch {
      hits = [];
    }

  const seoO = await getSeoOverride('home');
    return {
      desktopSlides: data.desktop || [],
      mobileSlides: data.mobile || [],
      hits,
      syncBrands,
      omoikiriCounts,
      city: locals.city,
      meta: {
        title: seoO?.title ||
          replaceCityPlaceholders(
            'Бытовая техника в {городе} — интернет-магазин Мультибренд | Рассрочка, доставка',
            locals.city
          ),
        description: seoO?.description ||
          replaceCityPlaceholders(
            'Интернет-магазин «Мультибренд» в {городе}: встраиваемая и кухонная бытовая техника, вытяжки, мойки и смесители. Помощь в подборе под ваш интерьер. Доставка.',
            locals.city
          ),
        canonical: seoO?.canonical ? safeCanonical(seoO.canonical, locals.siteOrigin) : safeCanonical('/', locals.siteOrigin)
      }
    };
  } catch {
    return {
      desktopSlides: [],
      mobileSlides: [],
      hits: [],
      syncBrands: [],
      omoikiriCounts: null,
      city: locals.city
    };
  }
};

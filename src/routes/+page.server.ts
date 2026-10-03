import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { getBrandConfig } from '$lib/server/tetrasis';

export const load: PageServerLoad = async ({ fetch }) => {
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

    // Промо-блоки: случайное реальное фото товара нужного бренда и категории
    const promoPick = async (brand: string, rootSlug: string): Promise<string | null> => {
      try {
        const rows = await sql`
          select pi.url
          from products p
          join lateral (
            select url from product_images
            where product_id = p.id
            order by position asc limit 1
          ) pi on true
          where p.brand->>'name' = ${brand}
            and p.catalog_root_slug = ${rootSlug}
            and p.price_rrc is not null
          order by random()
          limit 1`;
        return rows[0]?.url ?? null;
      } catch {
        return null;
      }
    };
    const [omoikiriMoiki, omoikiriSmesiteli, boneCrusherImg] = await Promise.all([
      promoPick('Omoikiri', 'kuhonnye-moyki'),
      promoPick('Omoikiri', 'smesiteli'),
      promoPick('Bone Crusher', 'izmelchiteli-pischevyh-othodov')
    ]);

    // Последние 3 статьи для секции на главной
    let latestArticles: any[] = [];
    try {
      latestArticles = await sql`
        SELECT id, slug, title, description, cover_url, created_at
        FROM articles
        WHERE is_published = true
        ORDER BY created_at DESC
        LIMIT 3
      `;
    } catch {
      // таблицы ещё нет
    }

    // Хиты продаж: 8 товаров с ценой и картинкой, выбор каждый раз новый
    let hits: any[] = [];
    try {
      hits = await sql`
        SELECT p.id, p.name, p.product_type, p.price_rrc, p.price_ric, p.specs,
               p.brand,
               COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images
        FROM products p
        LEFT JOIN product_images pi ON pi.product_id = p.id
        WHERE p.price_rrc IS NOT NULL
          AND EXISTS (SELECT 1 FROM product_images x WHERE x.product_id = p.id)
          AND p.product_type NOT ILIKE 'комплект%'
        GROUP BY p.id
        ORDER BY random()
        LIMIT 8
      `;
    } catch {
      hits = [];
    }

    return {
      desktopSlides: data.desktop || [],
      mobileSlides: data.mobile || [],
      latestArticles,
      hits,
      syncBrands,
      promoImages: { omoikiriMoiki, omoikiriSmesiteli, boneCrusherImg }
    };
  } catch {
    return {
      desktopSlides: [],
      mobileSlides: [],
      latestArticles: [],
      hits: [],
      syncBrands: [],
      promoImages: { omoikiriMoiki: null, omoikiriSmesiteli: null, boneCrusherImg: null }
    };
  }
};

import type { PageServerLoad } from './$types';
import { getBrandConfig } from '$lib/server/tetrasis';
import { getHomeHits } from '$lib/server/homeHits';
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

    // фото промо-блока Omoikiri — статичные ассеты (omoikiri-*.webp)

    // Хиты продаж: ручной список из админки (/admin/hits) — состав и порядок
    // задаёт заказчик. Пустой список — секция на главной не показывается
    // (автоподбора по брендам больше нет).
    let hits: any[] = [];
    try {
      hits = await getHomeHits();
    } catch {
      hits = [];
    }

  const seoO = await getSeoOverride('home');

    return {
      desktopSlides: data.desktop || [],
      mobileSlides: data.mobile || [],
      hits,
      syncBrands,
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
      city: locals.city
    };
  }
};

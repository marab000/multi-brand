import type { PageServerLoad } from './$types';
import { fetchProducts } from '$lib/server/catalogApi';

const SLOT_IMAGES_TYPES: Record<string, string[]> = {
  hob: [
    'Газовая поверхность',
    'Индукционная поверхность',
    'Комбинированная поверхность',
    'Электрическая поверхность',
    'Стеклокерамическая поверхность'
  ],
  oven: ['Электрический духовой шкаф', 'Газовый духовой шкаф', 'Компактный духовой шкаф'],
  hood: [
    'Вытяжка телескопическая',
    'Вытяжка в подвесной шкаф',
    'Вытяжка наклонная',
    'Вытяжка островная',
    'Вытяжка пристенная',
    'Вытяжка встраиваемая'
  ],
  dishwasher: [
    'Встраиваемая посудомоечная машина',
    'Компактная встраиваемая посудомоечная машина'
  ]
};

const pick = (products: any[]): string | null => {
  const withImages = products.filter((p) => p.images?.[0]?.url);
  return withImages.length
    ? withImages[Math.floor(Math.random() * withImages.length)].images[0].url
    : null;
};

export const load: PageServerLoad = async () => {
  try {
    const entries = await Promise.all(
      Object.entries(SLOT_IMAGES_TYPES).map(async ([slot, types]) => {
        const { products } = await fetchProducts({ types, sort: 'price_desc' }, 8);
        return [slot, pick(products as any[])];
      })
    );
    const slotImages = Object.fromEntries(entries);
    // hero — случайная премиальная вытяжка
    const heroImage = slotImages.hood;
    return { heroImage, slotImages };
  } catch {
    return { heroImage: null, slotImages: {} };
  }
};

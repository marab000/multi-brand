import { json } from '@sveltejs/kit';
import { fetchProducts } from '$lib/server/catalogApi';
import { SLOT_TYPES } from '$lib/podborSlots';

export async function GET({ url }) {
  try {
    const search = url.searchParams.get('q')?.trim();
    if (!search || search.length < 2) return json([]);

    // podbor=1 — только товары слотов викторины (для админки подбора):
    // фильтр по типам в SQL, чтобы комплекты не занимали выдачу
    const podborOnly = url.searchParams.get('podbor') === '1';
    if (podborOnly) {
      const slotTypes = Object.values(SLOT_TYPES).flat();
      const { products } = await fetchProducts({ search, types: slotTypes }, 30, 0);
      return json(products);
    }

    const { products } = await fetchProducts({ search, excludeKits: true }, 8, 0);
    return json(products);
  } catch (e) {
    console.error('SEARCH ERROR:', e);
    return json([]);
  }
}

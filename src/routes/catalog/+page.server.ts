import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const category = url.searchParams.get('category');
  const type = url.searchParams.get('type');

  // 🔧 Заглушка (потом будет БД)
  const allProducts = [
    { title: 'Мойка гранитная', price: 12000, category: 'moiki', type: 'granit' },
    { title: 'Мойка гранитная 1', price: 12000, category: 'moiki', type: 'granit' },
    { title: 'Мойка гранитная 2', price: 12000, category: 'moiki', type: 'granit' },
    { title: 'Мойка гранитная 3', price: 12000, category: 'moiki', type: 'granit' },
    { title: 'Мойка стальная 4', price: 9000, category: 'moiki', type: 'steel' },
    { title: 'Мойка стальная 5', price: 9000, category: 'moiki', type: 'steel' },
    { title: 'Мойка стальная 6', price: 9000, category: 'moiki', type: 'steel' },
    { title: 'Мойка стальная 7', price: 9000, category: 'moiki', type: 'steel' },
    { title: 'Мойка круглая', price: 6666, category: 'moiki', type: 'round' },
    { title: 'Мойка круглая', price: 6666, category: 'moiki', type: 'round' },
    { title: 'Газовая панель', price: 18000, category: 'hob', type: 'gas' }
  ];

  const products = allProducts.filter((p) => {
    if (!category) return true;
    return p.category === category && (!type || p.type === type);
  });

  return {
    category,
    type,
    products
  };
};

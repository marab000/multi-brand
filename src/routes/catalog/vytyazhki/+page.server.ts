import type { PageServerLoad } from './$types';
import type { CatalogFilters } from '$lib/server/catalogApi';
import { fetchProducts } from '$lib/server/catalogApi';
import { toDbPrice } from '$lib/utils/formatPrice';

function buildSpecs(url: URL): Record<string, { min?: number; max?: number }> | undefined {
  const specs: Record<string, { min?: number; max?: number }> = {};
  const widthMin = url.searchParams.get('width_min');
  const widthMax = url.searchParams.get('width_max');
  const heightMin = url.searchParams.get('height_min');
  const heightMax = url.searchParams.get('height_max');
  const depthMin = url.searchParams.get('depth_min');
  const depthMax = url.searchParams.get('depth_max');
  if (widthMin || widthMax) specs.width = { ...(widthMin ? { min: Math.floor(Number(widthMin)) } : {}), ...(widthMax ? { max: Math.ceil(Number(widthMax)) } : {}) };
  if (heightMin || heightMax) specs.height = { ...(heightMin ? { min: Math.floor(Number(heightMin)) } : {}), ...(heightMax ? { max: Math.ceil(Number(heightMax)) } : {}) };
  if (depthMin || depthMax) specs.depth = { ...(depthMin ? { min: Math.floor(Number(depthMin)) } : {}), ...(depthMax ? { max: Math.ceil(Number(depthMax)) } : {}) };
  return Object.keys(specs).length ? specs : undefined;
}

export const load: PageServerLoad = async ({ url }) => {
  const sortParam = url.searchParams.get('sort');
  const sort = sortParam === 'price_asc' || sortParam === 'price_desc' ? sortParam : 'default';
  const filters: CatalogFilters = {
    catalogScopes: [{ rootSlug: 'kuhonnye-vytyazhki' }],
    types: url.searchParams.getAll('type').map((item) => item.trim()).filter(Boolean),
    brands: url.searchParams.getAll('brand').map((item) => item.trim()).filter(Boolean),
    colors: url.searchParams.getAll('color').map((item) => item.trim()).filter(Boolean),
    priceMin: toDbPrice(url.searchParams.get('price_min')),
    priceMax: toDbPrice(url.searchParams.get('price_max')),
    specs: buildSpecs(url),
    sort
  };
  const perPage = 24;
  let page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
  if (!Number.isFinite(page) || page < 1) page = 1;
  const firstLoad = await fetchProducts(filters, 1, 0);
  const total = firstLoad.total;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (page > pages) page = pages;
  const offset = (page - 1) * perPage;
  const { products } = await fetchProducts(filters, perPage, offset);
  return {
    products,
    total,
    perPage,
    page,
    pages,
    title: 'Вытяжки',
    category: 'Вытяжки',
    currentSearch: url.searchParams.toString(),
    isCatalogLanding: true,
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Вытяжки' }
    ],
    sections: [
      {
        title: 'Вытяжки встраиваемые',
        text: 'Телескопические, потолочные, в шкаф и в столешницу.',
        href: '/catalog/kuhonnye-vytyazhki/vytyazhki-vstraivaemye'
      },
      {
        title: 'Вытяжки отдельностоящие',
        text: 'Наклонные, островные, пристенные, классические и другие модели.',
        href: '/catalog/kuhonnye-vytyazhki/vytyazhki-otdelnostoyaschie'
      }
    ]
  };
};
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { CatalogFilters } from '$lib/server/catalogApi';
import { fetchProducts } from '$lib/server/catalogApi';
import {
  filterCatalogRootsByAvailability,
  findCatalogGroupBySlug,
  findCatalogLeafBySlug,
  findCatalogRootBySlug,
  getCatalogRoots
} from '$lib/server/categories';
import { sql } from '$lib/db';

function buildSpecs(url: URL): Record<string, { min?: number; max?: number }> | undefined {
  const specs: Record<string, { min?: number; max?: number }> = {};
  const widthMin = url.searchParams.get('width_min');
  const widthMax = url.searchParams.get('width_max');
  const heightMin = url.searchParams.get('height_min');
  const heightMax = url.searchParams.get('height_max');
  const depthMin = url.searchParams.get('depth_min');
  const depthMax = url.searchParams.get('depth_max');

  if (widthMin || widthMax) {
    specs.width = {
      ...(widthMin ? { min: Math.floor(Number(widthMin)) } : {}),
      ...(widthMax ? { max: Math.ceil(Number(widthMax)) } : {})
    };
  }
  if (heightMin || heightMax) {
    specs.height = {
      ...(heightMin ? { min: Math.floor(Number(heightMin)) } : {}),
      ...(heightMax ? { max: Math.ceil(Number(heightMax)) } : {})
    };
  }
  if (depthMin || depthMax) {
    specs.depth = {
      ...(depthMin ? { min: Math.floor(Number(depthMin)) } : {}),
      ...(depthMax ? { max: Math.ceil(Number(depthMax)) } : {})
    };
  }

  return Object.keys(specs).length ? specs : undefined;
}

export const load: PageServerLoad = async ({ params, url }) => {
  const segments = params.params ? params.params.split('/') : [];
  const rootSlug = segments[0] ?? null;
  const groupSlug = segments[1] ?? null;
  const leafSlug = segments[2] ?? null;
  const isSearchPage = rootSlug === 'search';
  const sortParam = url.searchParams.get('sort');
  const sort =
    sortParam === 'price_asc' || sortParam === 'price_desc' ? sortParam : 'default';

  const availabilityRows = await sql`
    SELECT DISTINCT
      catalog_root_slug AS root_slug,
      catalog_group_slug AS group_slug,
      catalog_leaf_slug AS leaf_slug
    FROM products
    WHERE catalog_root_slug IS NOT NULL
      AND price_rrc IS NOT NULL
  `;

  const filteredRoots = filterCatalogRootsByAvailability(
    getCatalogRoots(),
    availabilityRows as any[]
  );

  const currentRoot = isSearchPage ? null : findCatalogRootBySlug(rootSlug, filteredRoots);
  if (!isSearchPage && !currentRoot) {
    throw error(404, 'Раздел не найден');
  }

  const currentGroup =
    !isSearchPage && currentRoot ? findCatalogGroupBySlug(currentRoot, groupSlug) : null;
  if (!isSearchPage && groupSlug && !currentGroup) {
    throw error(404, 'Группа не найдена');
  }

  const currentLeaf =
    !isSearchPage && currentGroup && !currentGroup.isDynamicByProductType
      ? findCatalogLeafBySlug(currentGroup, leafSlug)
      : null;

  if (!isSearchPage && leafSlug && !currentGroup?.isDynamicByProductType && !currentLeaf) {
    throw error(404, 'Подкатегория не найдена');
  }

  const selectedTypes = url.searchParams
    .getAll('type')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!isSearchPage && currentGroup?.isDynamicByProductType && leafSlug) {
    throw error(404, 'Подкатегория не найдена');
  }

  if (isSearchPage && (groupSlug || leafSlug)) {
    throw error(404, 'Страница поиска не найдена');
  }

  const filters: CatalogFilters = {
    search: url.searchParams.get('search')?.trim() || undefined,
    catalogRootSlug: isSearchPage ? undefined : currentRoot?.slug,
    catalogGroupSlug: isSearchPage ? undefined : currentGroup?.slug || undefined,
    catalogLeafSlug: isSearchPage ? undefined : currentLeaf?.slug || undefined,
    types: selectedTypes.length ? selectedTypes : undefined,
    brands: url.searchParams.getAll('brand'),
    colors: url.searchParams.getAll('color'),
    priceMin: url.searchParams.get('price_min')
      ? Number(url.searchParams.get('price_min')) / 1000
      : undefined,
    priceMax: url.searchParams.get('price_max')
      ? Number(url.searchParams.get('price_max')) / 1000
      : undefined,
    specs: buildSpecs(url),
    sort
  };

  const perPage = 30;
  let page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
  const offset = (page - 1) * perPage;

  const { products, total } = await fetchProducts(filters, perPage, offset);

  if (!isSearchPage && groupSlug && total === 0) {
    throw error(404, 'Категория пуста');
  }

  const pages = Math.ceil(total / perPage) || 1;
  if (page > pages) page = pages;

  let title = 'Каталог';
  if (isSearchPage) title = 'Поиск';
  else if (selectedTypes.length === 1) title = selectedTypes[0];
  else if (currentLeaf) title = currentLeaf.name;
  else if (currentGroup) title = currentGroup.name;
  else if (currentRoot) title = currentRoot.name;

  const breadcrumbs: { name: string; href?: string }[] = [
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' }
  ];

  if (isSearchPage) {
    breadcrumbs.push({ name: 'Поиск' });
  } else if (currentRoot) {
    breadcrumbs.push({ name: currentRoot.name, href: `/catalog/${currentRoot.slug}` });

    if (currentGroup) {
      breadcrumbs.push({
        name: currentGroup.name,
        href: `/catalog/${currentRoot.slug}/${currentGroup.slug}`
      });
    }

    if (selectedTypes.length === 1) {
      breadcrumbs.push({ name: selectedTypes[0] });
    } else if (currentLeaf) {
      breadcrumbs.push({ name: currentLeaf.name });
    }
  }

  return {
    products,
    total,
    perPage,
    page,
    pages,
    title,
    breadcrumbs,
    category: isSearchPage ? null : (currentRoot?.name ?? null),
    type: isSearchPage
      ? null
      : selectedTypes.length === 1
        ? selectedTypes[0]
        : (currentLeaf?.name ?? currentGroup?.name ?? null),
    currentSearch: url.searchParams.toString(),
    catalogRoots: filteredRoots,
    isSearchPage
  };
};
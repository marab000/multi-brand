import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import type { CatalogFilters } from '$lib/server/catalogApi';
import { fetchProducts, countProducts } from '$lib/server/catalogApi';
import {
  filterCatalogRootsByAvailability,
  findCatalogGroupBySlug,
  findCatalogLeafBySlug,
  findCatalogRootBySlug,
  getCatalogRoots
} from '$lib/server/categories';
import { sql } from '$lib/db';
import { toDbPrice } from '$lib/utils/formatPrice';
import { buildCategorySeo } from '$lib/server/seoText';
import { getSeoOverride, safeCanonical } from '$lib/server/seoOverrides';

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
  // Комплекты убрали с сайта — старые ссылки ведём на раздел встраиваемой техники
  if (segments.includes('komplekty')) {
    redirect(301, '/catalog/vstraivaemaya-tehnika');
  }
  const isSearchPage = rootSlug === 'search';
  const search = url.searchParams.get('search')?.trim() || undefined;
  const sortParam = url.searchParams.get('sort');
  const sort = sortParam === 'price_asc' || sortParam === 'price_desc' ? sortParam : 'default';
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
  const specs = buildSpecs(url);
  const brands = url.searchParams
    .getAll('brand')
    .map((item) => item.trim())
    .filter(Boolean);
  const colors = url.searchParams
    .getAll('color')
    .map((item) => item.trim())
    .filter(Boolean);
  const priceMin = toDbPrice(url.searchParams.get('price_min'));
  const priceMax = toDbPrice(url.searchParams.get('price_max'));
  const hasSearch = Boolean(search);
  const hasRealFilters =
    selectedTypes.length > 0 ||
    brands.length > 0 ||
    colors.length > 0 ||
    priceMin != null ||
    priceMax != null ||
    Boolean(specs) ||
    sort !== 'default';
  const hasAppliedFilters = hasSearch || hasRealFilters;
  const filters: CatalogFilters = {
    search,
    // Комплекты спрятаны только из поиска — в категориях и по прямой ссылке остаются
    excludeKits: isSearchPage ? true : undefined,
    catalogRootSlug: isSearchPage ? undefined : currentRoot?.slug,
    catalogGroupSlug: isSearchPage ? undefined : currentGroup?.slug || undefined,
    catalogLeafSlug: isSearchPage ? undefined : currentLeaf?.slug || undefined,
    types: selectedTypes.length ? selectedTypes : undefined,
    brands,
    colors,
    priceMin,
    priceMax,
    specs,
    sort
  };
  const perPage = 24;
  let page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
  if (!Number.isFinite(page) || page < 1) page = 1;
  // лёгкий COUNT вместо полной выборки в один ряд ради total
  const total = await countProducts(filters);
  if (!isSearchPage && groupSlug && total === 0 && !hasAppliedFilters) {
    throw error(404, 'Категория пуста');
  }
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (page > pages) page = pages;
  const offset = (page - 1) * perPage;
  const { products } = await fetchProducts(filters, perPage, offset);
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
  // SEO-текст категории: только для чистых URL категории (без фильтров/поиска)
  let seo: { heading: string; paragraphs: string[] } | null = null;
  if (!isSearchPage && !hasAppliedFilters && total > 0 && currentRoot) {
    try {
      const slugCond =
        currentLeaf?.slug != null
          ? sql`catalog_leaf_slug = ${currentLeaf.slug}`
          : currentGroup?.slug != null
            ? sql`catalog_group_slug = ${currentGroup.slug}`
            : sql`catalog_root_slug = ${currentRoot.slug}`;
      const statsRows = await sql`
        select
          min(price_rrc) as min_p,
          max(price_rrc) as max_p
        from products
        where price_rrc is not null and ${slugCond}
      `;
      const brandRows = await sql`
        select brand->>'name' as name, count(*)::int as c
        from products
        where price_rrc is not null and brand->>'name' is not null and ${slugCond}
        group by 1
        order by 2 desc
        limit 8
      `;
      const toRub = (v: any) => (v == null ? null : Math.round(Number(v) * 1000));
      seo = buildCategorySeo({
        name: title,
        count: total,
        brands: brandRows.map((b) => b.name),
        minPrice: toRub(statsRows[0]?.min_p),
        maxPrice: toRub(statsRows[0]?.max_p)
      });
    } catch {
      seo = null;
    }
  }

  // Ручные SEO-переопределения (title/description/canonical/h1)
  const categoryPath = isSearchPage
    ? '/catalog/search'
    : `/catalog/${[currentRoot?.slug, currentGroup?.slug, currentLeaf?.slug].filter(Boolean).join('/')}`;
  const metaO = isSearchPage
    ? null
    : await getSeoOverride(
        `category:${[currentRoot?.slug, currentGroup?.slug, currentLeaf?.slug].filter(Boolean).join('/')}`
      );
  if (metaO?.title) title = metaO.title;

  // Персональный текст спойлера «О разделе»: точная страница → корень → автогенерация
  if (!isSearchPage && seo) {
    let sectionText = metaO?.section_text ?? null;
    if (!sectionText && currentRoot?.slug) {
      const exactKey = `category:${[currentRoot?.slug, currentGroup?.slug, currentLeaf?.slug].filter(Boolean).join('/')}`;
      if (exactKey !== `category:${currentRoot.slug}`) {
        const rootO = await getSeoOverride(`category:${currentRoot.slug}`);
        sectionText = rootO?.section_text ?? null;
      }
    }
    if (sectionText) {
      const paragraphs = sectionText
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (paragraphs.length) seo = { ...seo, paragraphs };
    }
  }

  const canonical = metaO?.canonical
    ? safeCanonical(metaO.canonical)
    : safeCanonical(hasAppliedFilters || page > 1 ? categoryPath : url.pathname);

  return {
    seoH1: metaO?.h1 ?? null,
    canonical,
    metaDescription: metaO?.description ?? null,
    products,
    total,
    perPage,
    page,
    pages,
    title,
    seo,
    breadcrumbs,
    category: isSearchPage ? null : title,
    type: isSearchPage
      ? null
      : selectedTypes.length === 1
        ? selectedTypes[0]
        : (currentLeaf?.name ?? currentGroup?.name ?? null),
    currentSearch: url.searchParams.toString(),
    catalogRoots: filteredRoots,
    isSearchPage,
    hasSearch,
    hasRealFilters,
    hasAppliedFilters
  };
};

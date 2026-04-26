import type { LayoutServerLoad } from './$types';
import { sql } from '$lib/db';
import type { CatalogFilters } from '$lib/server/catalogApi';
import { buildWhere } from '$lib/server/catalogApi';
import {
  filterCatalogRootsByAvailability,
  findCatalogGroupBySlug,
  findCatalogRootBySlug,
  getCatalogNav,
  getCatalogRoots,
  slugifyCatalogValue
} from '$lib/server/categories';
import { normalizePrice } from '$lib/utils/formatPrice';

type MinMax = {
  price: [number, number];
  width: [number, number];
  height: [number, number];
  depth: [number, number];
};

type ProductScopeRow = {
  brand_name: string | null;
  product_type: string | null;
  price_rrc: number | string | null;
  specs: Record<string, any> | null;
  catalog_root_slug: string | null;
  catalog_group_slug: string | null;
  catalog_leaf_slug: string | null;
};

type CategoryNavItem = { name: string; slug: string; href: string; level: 'group' | 'leaf' };

function parseSpecsValue(specs: Record<string, any> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const val = specs?.[key];
    if (!val) continue;
    const str = String(val).replace(',', '.');
    const match = str.match(/\d+(\.\d+)?/);
    if (match) {
      const num = parseFloat(match[0]);
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

function buildScopeWhere(
  rootSlug: string | null,
  groupSlug: string | null,
  leafSlug: string | null,
  selectedTypes: string[]
) {
  const clauses: string[] = ['price_rrc IS NOT NULL'];
  const values: any[] = [];
  if (rootSlug) {
    values.push(rootSlug);
    clauses.push(`catalog_root_slug = $${values.length}`);
  }
  if (groupSlug) {
    values.push(groupSlug);
    clauses.push(`catalog_group_slug = $${values.length}`);
  }
  if (leafSlug) {
    values.push(leafSlug);
    clauses.push(`catalog_leaf_slug = $${values.length}`);
  }
  if (selectedTypes.length) {
    values.push(selectedTypes);
    clauses.push(`TRIM(product_type) = ANY($${values.length}::text[])`);
  }
  return {
    where: `WHERE ${clauses.join(' AND ')}`,
    values
  };
}

function buildSearchCategoryNav(
  rows: ProductScopeRow[],
  filteredRoots: ReturnType<typeof getCatalogRoots>,
  searchValue: string
): CategoryNavItem[] {
  const searchParam = searchValue ? `search=${encodeURIComponent(searchValue)}` : '';
  const items = new Map<string, CategoryNavItem>();
  for (const row of rows) {
    if (!row.catalog_root_slug) continue;
    const root = findCatalogRootBySlug(row.catalog_root_slug, filteredRoots);
    if (!root) continue;
    if (row.catalog_group_slug) {
      const group = root.groups.find((item) => item.slug === row.catalog_group_slug);
      if (group && !group.isDefault) {
        const href = `/catalog/${root.slug}/${group.slug}${searchParam ? `?${searchParam}` : ''}`;
        const key = `group::${href}`;
        if (!items.has(key)) {
          items.set(key, {
            name: group.name,
            slug: group.slug,
            href,
            level: 'group'
          });
        }
        if (row.catalog_leaf_slug && !group.isDynamicByProductType) {
          const leaf = group.leaves.find((item) => item.slug === row.catalog_leaf_slug);
          if (leaf) {
            const leafHref = `/catalog/${root.slug}/${group.slug}/${leaf.slug}${searchParam ? `?${searchParam}` : ''}`;
            const leafKey = `leaf::${leafHref}`;
            if (!items.has(leafKey)) {
              items.set(leafKey, {
                name: `${group.name} — ${leaf.name}`,
                slug: leaf.slug,
                href: leafHref,
                level: 'leaf'
              });
            }
          }
        }
      }
    }
  }
  return Array.from(items.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export const load: LayoutServerLoad = async ({ url }) => {
  const segments = url.pathname.split('/').filter(Boolean);
  const rootSlug = segments[1] ?? null;
  const groupSlug = segments[2] ?? null;
  const leafSlug = segments[3] ?? null;
  const isSearchPage = rootSlug === 'search';
  const selectedTypes = url.searchParams
    .getAll('type')
    .map((item) => item.trim())
    .filter(Boolean);
  const allRoots = getCatalogRoots();
  const availabilityRows = await sql`
    SELECT DISTINCT
      catalog_root_slug AS root_slug,
      catalog_group_slug AS group_slug,
      catalog_leaf_slug AS leaf_slug
    FROM products
    WHERE catalog_root_slug IS NOT NULL
      AND price_rrc IS NOT NULL
  `;
  const filteredRoots = filterCatalogRootsByAvailability(allRoots, availabilityRows as any[]);
  const currentRoot = isSearchPage ? null : findCatalogRootBySlug(rootSlug, filteredRoots);
  const currentGroup = isSearchPage ? null : findCatalogGroupBySlug(currentRoot, groupSlug);
  let products: ProductScopeRow[] = [];
  let categoryNav: CategoryNavItem[] = [];
  if (isSearchPage) {
    const filters: CatalogFilters = {
      search: url.searchParams.get('search')?.trim() || undefined,
      types: selectedTypes.length ? selectedTypes : undefined,
      brands: url.searchParams.getAll('brand'),
      colors: url.searchParams.getAll('color'),
      priceMin: url.searchParams.get('price_min')
        ? Number(url.searchParams.get('price_min')) / 1000
        : undefined,
      priceMax: url.searchParams.get('price_max')
        ? Number(url.searchParams.get('price_max')) / 1000
        : undefined,
      specs: (() => {
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
      })()
    };
    const { whereClause, values } = buildWhere(filters);
    products = (await sql.unsafe(
      `
        SELECT
          brand->>'name' AS brand_name,
          product_type,
          price_rrc,
          specs,
          catalog_root_slug,
          catalog_group_slug,
          catalog_leaf_slug
        FROM products p
        ${whereClause}
      `,
      values
    )) as unknown as ProductScopeRow[];
    categoryNav = buildSearchCategoryNav(
      products,
      filteredRoots,
      url.searchParams.get('search')?.trim() || ''
    );
  } else {
    const { where, values } = buildScopeWhere(
      rootSlug,
      groupSlug,
      currentGroup?.isDynamicByProductType ? null : leafSlug,
      selectedTypes
    );
    products = (await sql.unsafe(
      `
        SELECT
          brand->>'name' AS brand_name,
          product_type,
          price_rrc,
          specs,
          catalog_root_slug,
          catalog_group_slug,
          catalog_leaf_slug
        FROM products
        ${where}
      `,
      values
    )) as unknown as ProductScopeRow[];
    categoryNav = getCatalogNav(url.pathname, filteredRoots);
    if (currentRoot && currentGroup?.isDynamicByProductType) {
      const dynamicTypeRows = await sql.unsafe(
        `
          SELECT DISTINCT product_type
          FROM products
          WHERE catalog_root_slug = $1
            AND catalog_group_slug = $2
            AND product_type IS NOT NULL
            AND price_rrc IS NOT NULL
          ORDER BY product_type ASC
        `,
        [currentRoot.slug, currentGroup.slug]
      );
      categoryNav = dynamicTypeRows
        .map((row: any) => String(row.product_type || '').trim())
        .filter(Boolean)
        .map((name: string) => ({
          name,
          slug: slugifyCatalogValue(name),
          href: `/catalog/${currentRoot.slug}/${currentGroup.slug}?type=${encodeURIComponent(name)}`,
          level: 'leaf' as const
        }));
    }
  }
  const brands = [...new Set(products.map((p) => p.brand_name?.trim()).filter(Boolean))];
  const colors = [...new Set(products.map((p) => p.specs?.['Цвет']?.trim()).filter(Boolean))];
  const prices = products
    .map((p) => normalizePrice(Number(p.price_rrc)))
    .filter((value) => Number.isFinite(value));
  const priceMax = prices.length ? Math.max(...prices) : 0;
  const sizeMap = {
    width: ['Размер (Ширина)', 'Размер (Ширина), см', 'Ширина прибора'],
    height: ['Размер (Высота)', 'Размер (Высота), см', 'Высота прибора'],
    depth: ['Размер (Глубина)', 'Размер (Глубина), см', 'Глубина прибора']
  };
  const widths = products
    .map((p) => parseSpecsValue(p.specs, sizeMap.width))
    .filter((v: number | null): v is number => v != null);
  const heights = products
    .map((p) => parseSpecsValue(p.specs, sizeMap.height))
    .filter((v: number | null): v is number => v != null);
  const depths = products
    .map((p) => parseSpecsValue(p.specs, sizeMap.depth))
    .filter((v: number | null): v is number => v != null);
  const minMax: MinMax = {
    price: [0, priceMax],
    width: [0, widths.length ? Math.max(...widths) : 0],
    height: [0, heights.length ? Math.max(...heights) : 0],
    depth: [0, depths.length ? Math.max(...depths) : 0]
  };
  return {
    categoryNav,
    typeGroups: [],
    brands,
    colors,
    minMax,
    catalogRoots: filteredRoots
  };
};

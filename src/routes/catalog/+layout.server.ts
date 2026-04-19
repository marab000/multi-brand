import type { LayoutServerLoad } from './$types';
import { sql } from '$lib/db';
import {
  filterCatalogRootsByAvailability,
  findCatalogGroupBySlug,
  findCatalogRootBySlug,
  getCatalogNav,
  getCatalogRoots,
  slugifyCatalogValue
} from '$lib/server/categories';

type MinMax = {
  price: [number, number];
  width: [number, number];
  height: [number, number];
  depth: [number, number];
};

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

export const load: LayoutServerLoad = async ({ url }) => {
  const segments = url.pathname.split('/').filter(Boolean);
  const rootSlug = segments[1] ?? null;
  const groupSlug = segments[2] ?? null;
  const leafSlug = segments[3] ?? null;
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

  const currentRoot = findCatalogRootBySlug(rootSlug, filteredRoots);
  const currentGroup = findCatalogGroupBySlug(currentRoot, groupSlug);

  const { where, values } = buildScopeWhere(
    rootSlug,
    groupSlug,
    currentGroup?.isDynamicByProductType ? null : leafSlug,
    selectedTypes
  );

  const products = await sql.unsafe(
    `
      SELECT
        brand->>'name' AS brand_name,
        product_type,
        price_rrc,
        specs
      FROM products
      ${where}
    `,
    values
  );

  const brands = [...new Set(products.map((p: any) => p.brand_name?.trim()).filter(Boolean))];
  const colors = [...new Set(products.map((p: any) => p.specs?.['Цвет']?.trim()).filter(Boolean))];

  const prices = products
    .map((p: any) => Math.round(Number(p.price_rrc) * 1000))
    .filter((value: number) => Number.isFinite(value));
  const priceMax = prices.length ? Math.max(...prices) : 0;

  const sizeMap = {
    width: ['Размер (Ширина)', 'Размер (Ширина), см', 'Ширина прибора'],
    height: ['Размер (Высота)', 'Размер (Высота), см', 'Высота прибора'],
    depth: ['Размер (Глубина)', 'Размер (Глубина), см', 'Глубина прибора']
  };

  const widths = products
    .map((p: any) => parseSpecsValue(p.specs, sizeMap.width))
    .filter((v: number | null): v is number => v != null);
  const heights = products
    .map((p: any) => parseSpecsValue(p.specs, sizeMap.height))
    .filter((v: number | null): v is number => v != null);
  const depths = products
    .map((p: any) => parseSpecsValue(p.specs, sizeMap.depth))
    .filter((v: number | null): v is number => v != null);

  const minMax: MinMax = {
    price: [0, priceMax],
    width: [0, widths.length ? Math.max(...widths) : 0],
    height: [0, heights.length ? Math.max(...heights) : 0],
    depth: [0, depths.length ? Math.max(...depths) : 0]
  };

  let categoryNav = getCatalogNav(url.pathname, filteredRoots);

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

  return {
    categoryNav,
    typeGroups: [],
    brands,
    colors,
    minMax,
    catalogRoots: filteredRoots
  };
};

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import {
  filterCatalogRootsByAvailability,
  getCatalogRoots,
  getCatalogShowcase
} from '$lib/server/categories';
import { getBrandConfig } from '$lib/server/tetrasis';

export const load: PageServerLoad = async ({ url }) => {
  const params = url.searchParams;

  const hasFilters =
    params.get('search') ||
    params.get('brand') ||
    params.get('color') ||
    params.get('price_min') ||
    params.get('price_max') ||
    params.get('width_min') ||
    params.get('width_max') ||
    params.get('height_min') ||
    params.get('height_max') ||
    params.get('depth_min') ||
    params.get('depth_max');

  if (hasFilters) {
    throw redirect(302, `/catalog/search?${params.toString()}`);
  }

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

  // Бренды для блока внизу каталога — из включённых в синке (админка → «Тетрис»)
  let syncBrands: string[] = [];
  try {
    syncBrands = (await getBrandConfig()).enabled.slice().sort((a, b) => a.localeCompare(b, 'ru'));
  } catch {
    // настроек ещё нет — блок просто не покажется
  }

  return {
    catalogRoots: filteredRoots,
    catalogShowcase: getCatalogShowcase(filteredRoots),
    syncBrands
  };
};

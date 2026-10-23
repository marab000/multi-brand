import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { getLiveCatalog } from '$lib/server/liveCatalog';
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

  // Бренды для блока внизу каталога — из включённых в синке (админка → «Тетрис»)
  let syncBrands: string[] = [];
  try {
    syncBrands = (await getBrandConfig()).enabled.slice().sort((a, b) => a.localeCompare(b, 'ru'));
  } catch {
    // настроек ещё нет — блок просто не покажется
  }

  const [rootsAndShowcase, countRows] = await Promise.all([
    getLiveCatalog(),
    sql`
      SELECT LOWER(TRIM(catalog_root_slug)) AS root_slug, COUNT(*)::int AS count
      FROM products
      WHERE catalog_root_slug IS NOT NULL AND price_rrc IS NOT NULL
      GROUP BY 1
    `
  ]);
  const { roots, showcase } = rootsAndShowcase;

  const rootCounts: Record<string, number> = {};
  for (const row of countRows as unknown as { root_slug: string; count: number }[]) {
    rootCounts[row.root_slug] = row.count;
  }

  return {
    catalogRoots: roots,
    catalogShowcase: showcase,
    rootCounts,
    syncBrands
  };
};

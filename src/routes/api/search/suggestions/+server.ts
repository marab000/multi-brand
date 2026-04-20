import { json } from '@sveltejs/kit';
import { fetchProducts } from '$lib/server/catalogApi';
import {
  getBrandSuggestions,
  getCategorySuggestions,
  type CatalogAvailability
} from '$lib/server/catalogSuggestions';
import { sql } from '$lib/db';

type AvailabilityRow = {
  root_slug: string | null;
  group_slug: string | null;
  leaf_slug: string | null;
};

async function getCatalogAvailability(): Promise<CatalogAvailability> {
  const rows = await sql`
    SELECT DISTINCT
      catalog_root_slug AS root_slug,
      catalog_group_slug AS group_slug,
      catalog_leaf_slug AS leaf_slug
    FROM products
    WHERE catalog_root_slug IS NOT NULL
      AND price_rrc IS NOT NULL
  `;
  const rootSet = new Set<string>();
  const groupSet = new Set<string>();
  const leafSet = new Set<string>();
  const hasRootLevelProducts = new Set<string>();

  for (const row of rows as unknown as AvailabilityRow[]) {
    if (!row.root_slug) continue;
    rootSet.add(row.root_slug);
    if (!row.group_slug && !row.leaf_slug) hasRootLevelProducts.add(row.root_slug);
    if (row.group_slug) groupSet.add(`${row.root_slug}::${row.group_slug}`);
    if (row.group_slug && row.leaf_slug) {
      leafSet.add(`${row.root_slug}::${row.group_slug}::${row.leaf_slug}`);
    }
  }

  return { rootSet, groupSet, leafSet, hasRootLevelProducts };
}

export async function GET({ url }) {
  try {
    const query = url.searchParams.get('q')?.trim() || '';
    if (query.length < 2) return json({ suggestions: [], products: [] });

    const [availability, productResult] = await Promise.all([
      getCatalogAvailability(),
      fetchProducts({ search: query }, 8, 0)
    ]);

    const categories = getCategorySuggestions(query, { limit: 4, availability });
    const brands = getBrandSuggestions(query, 2);
    const suggestions = [...categories, ...brands]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return json({ suggestions, products: productResult.products });
  } catch (e) {
    console.error('SEARCH SUGGESTIONS ERROR:', e);
    return json({ suggestions: [], products: [] });
  }
}
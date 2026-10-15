import type { LayoutServerLoad } from './$types';
import { sql } from '$lib/db';
import { filterCatalogRootsByAvailability, getCatalogRoots } from '$lib/server/categories';
import { getContacts } from '$lib/server/contacts';

export const load: LayoutServerLoad = async ({ locals }) => {
  const [availabilityRows, contacts, searchHintRows] = await Promise.all([
    sql`
      SELECT DISTINCT
        catalog_root_slug AS root_slug,
        catalog_group_slug AS group_slug,
        catalog_leaf_slug AS leaf_slug
      FROM products
      WHERE catalog_root_slug IS NOT NULL
        AND price_rrc IS NOT NULL
    `,
    getContacts(),
    // подсказки в поиске: случайные товары для анимации печати
    sql`select name from products where price_rrc > 0 order by random() limit 8`
  ]);

  const filteredRoots = filterCatalogRootsByAvailability(
    getCatalogRoots(),
    availabilityRows as any[]
  );

  return {
    catalogRoots: filteredRoots,
    contacts,
    searchHints: searchHintRows.map((r) => r.name),
    user: locals.user
  };
};

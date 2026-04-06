import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

export async function getTypeGroups(category?: string) {
  const products = category
    ? await sql`
        SELECT category, product_type
        FROM products
        WHERE category = ${category}
          AND category IS NOT NULL
          AND product_type IS NOT NULL
      `
    : await sql`
        SELECT category, product_type
        FROM products
        WHERE category IS NOT NULL AND product_type IS NOT NULL
      `;

  const map: Record<string, Set<string>> = {};
  const slugMap: Record<string, Record<string, string>> = {}; // category -> type -> slug

  for (const p of products) {
    const cat = p.category?.trim();
    const type = p.product_type?.trim();
    if (!cat || !type) continue;

    if (!map[cat]) map[cat] = new Set();
    if (!slugMap[cat]) slugMap[cat] = {};

    if (!slugMap[cat][type]) slugMap[cat][type] = slugify(type);

    map[cat].add(type);
  }

  return Object.entries(map).map(([group, items]) => ({
    group,
    items: Array.from(items).map((name) => ({ name, slug: slugMap[group][name] }))
  }));
}

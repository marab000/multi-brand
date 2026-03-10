import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

export async function resolveCategory(categorySlug: string | null) {
  if (!categorySlug) return null;
  const rows = await sql`select distinct category from products`;
  const match = rows.find((r) => slugify(r.category) === categorySlug);
  return match ? match.category : null;
}

export async function resolveType(typeSlug: string | null) {
  if (!typeSlug) return null;
  const rows = await sql`select distinct product_type from products`;
  const match = rows.find((r) => slugify(r.product_type) === typeSlug);
  return match ? match.product_type : null;
}

export async function resolveBrand(brandSlug: string | null) {
  if (!brandSlug) return null;
  const rows = await sql`
select distinct brand_name
from products
where lower(brand_name)=${brandSlug}
limit 1
`;
  return rows.length ? rows[0].brand_name : null;
}

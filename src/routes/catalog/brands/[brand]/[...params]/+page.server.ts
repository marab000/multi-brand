import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const brandSlug = params.brand;
  const raw = params.params;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const categorySlug = parts[0] ?? null;
  const typeSlug = parts[1] ?? null;

  const brandRow = await sql`
		select distinct brand_name
		from products
		where lower(brand_name) = ${brandSlug}
		limit 1
	`;

  if (!brandRow.length) {
    return {
      products: [],
      total: 0,
      pages: 1,
      page: 1,
      brand: brandSlug,
      category: null,
      type: null,
      currentSearch: Object.fromEntries(url.searchParams)
    };
  }

  const brandName = brandRow[0].brand_name;

  let category: string | null = null;
  let type: string | null = null;

  if (categorySlug) {
    const rows = await sql`
			select distinct category
			from products
			where brand_name = ${brandName}
		`;

    const match = rows.find((r) => slugify(r.category) === categorySlug);
    if (match) category = match.category;
  }

  if (typeSlug) {
    const rows = await sql`
			select distinct product_type
			from products
			where brand_name = ${brandName}
		`;

    const match = rows.find((r) => slugify(r.product_type) === typeSlug);
    if (match) type = match.product_type;
  }

  const page = Number(url.searchParams.get('page') ?? '1');

  const query = new URLSearchParams();
  query.set('brand', brandName);

  if (category) query.set('category', category);
  if (type) query.set('type', type);

  query.set('page', String(page));

  const res = await fetch(`/api/products?${query.toString()}`);
  const json = res.ok ? await res.json() : { products: [], total: 0, pages: 1, page: 1 };

  return {
    products: json.products ?? [],
    total: json.total ?? 0,
    pages: json.pages ?? 1,
    page: json.page ?? 1,
    brand: brandName,
    category,
    type,
    currentSearch: Object.fromEntries(url.searchParams)
  };
};

import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const parts = params.params ? params.params.split('/') : [];

  const categorySlug = parts[0] ?? null;
  const typeSlug = parts[1] ?? null;

  let category: string | null = null;
  let type: string | null = null;

  if (categorySlug) {
    const rows = await sql`
select distinct category
from products
`;

    const match = rows.find((r) => slugify(r.category) === categorySlug);
    if (match) category = match.category;
  }

  if (typeSlug) {
    const rows = await sql`
select distinct product_type
from products
`;

    const match = rows.find((r) => slugify(r.product_type) === typeSlug);
    if (match) type = match.product_type;
  }

  const page = Number(url.searchParams.get('page') ?? '1');

  const query = new URLSearchParams();

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
    brand: null,
    category,
    type,
    currentSearch: Object.fromEntries(url.searchParams)
  };
};

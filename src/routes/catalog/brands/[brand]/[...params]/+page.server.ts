import type { PageServerLoad } from './$types';
import { resolveBrand, resolveCategory, resolveType } from '$lib/server/catalogLoader';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const parts = params.params ? params.params.split('/') : [];
  const categorySlug = parts[0] ?? null;
  const typeSlug = parts[1] ?? null;

  const brand = await resolveBrand(params.brand);
  const category = await resolveCategory(categorySlug);
  const type = await resolveType(typeSlug);

  const page = Number(url.searchParams.get('page') ?? '1');

  const query = new URLSearchParams();
  if (brand) query.set('brand', brand);
  if (category) query.set('category', category);
  if (type) query.set('type', type);
  query.set('page', String(page));

  const res = await fetch(`/api/products?${query}`);
  const json = res.ok ? await res.json() : { products: [], total: 0, pages: 1, page: 1 };

  return {
    products: json.products ?? [],
    total: json.total ?? 0,
    pages: json.pages ?? 1,
    page: json.page ?? 1,
    brand,
    category,
    type,
    currentSearch: Object.fromEntries(url.searchParams)
  };
};

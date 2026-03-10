import type { PageServerLoad } from './$types';
import { resolveCategory, resolveType } from '$lib/server/catalogLoader';
import { loadProducts } from '$lib/server/catalogApi';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const parts = params.params ? params.params.split('/') : [];
  const categorySlug = parts[0] ?? null;
  const typeSlug = parts[1] ?? null;
  const category = await resolveCategory(categorySlug);
  const type = await resolveType(typeSlug);
  const page = Number(url.searchParams.get('page') ?? '1');
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (type) query.set('type', type);
  query.set('page', String(page));
  const json = await loadProducts(fetch, query);
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

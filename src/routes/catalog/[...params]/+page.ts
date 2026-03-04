import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, url }) => {
  const raw = params.params;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const brand = parts[0] ?? null;
  const category = parts[1] ?? null;
  const type = parts[2] ?? null;

  const page = Number(url.searchParams.get('page') ?? 1);

  const query = new URLSearchParams();

  if (brand) query.set('brand', brand);
  if (category) query.set('category', category);
  if (type) query.set('type', type);

  query.set('page', String(page));
  query.set('limit', '9');

  const res = await fetch(`/api/products?${query.toString()}`);
  const data = res.ok ? await res.json() : null;

  return {
    products: data?.products ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 1,
    brand,
    category,
    type,
    currentSearch: url.searchParams.toString() // 👈 добавляем
  };
};

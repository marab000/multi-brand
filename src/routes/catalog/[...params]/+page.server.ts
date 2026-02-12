import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const raw = params.params;
  const parts = Array.isArray(raw)
    ? raw
    : raw
      ? [raw]
      : [];

  const brand = parts[0] ?? null;
  const category = parts[1] ?? null;
  const type = parts[2] ?? null;

  const query = new URLSearchParams();

  if (brand) query.set('brand', brand);
  if (category) query.set('category', category);
  if (type) query.set('type', type);

  const res = await fetch(`/api/products?${query.toString()}`);
  const products = res.ok ? await res.json() : [];

  return {
    products: products ?? [],
    brand,
    category,
    type
  };
};

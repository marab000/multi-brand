import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const res = await fetch(`/api/products/${params.slug}`);
  const product = res.ok ? await res.json() : null;
  return { product };
};

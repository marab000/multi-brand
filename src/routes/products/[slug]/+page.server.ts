import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/api';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const product = await apiFetch(fetch, `/api/products/${params.slug}`).catch(() => null);
  return { product };
};

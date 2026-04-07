import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/api';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const product = await apiFetch(fetch, `/api/products/${params.slug}`);

  if (!product) {
    throw error(404, 'Product not found');
  }

  return { product };
};

import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/api';

export const load: PageServerLoad = async ({ fetch }) => {
  const brands = await apiFetch<any[]>(fetch, '/api/brands').catch(() => []);
  return { brands };
};

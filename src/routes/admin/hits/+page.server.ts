import type { PageServerLoad } from './$types';
import { listHomeHits } from '$lib/server/homeHits';

export const load: PageServerLoad = async () => {
  return { items: await listHomeHits() };
};

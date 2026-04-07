import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
  const params = url.searchParams;

  const hasFilters =
    params.get('search') ||
    params.get('type') ||
    params.get('brand') ||
    params.get('color') ||
    params.get('category');

  if (hasFilters) {
    throw redirect(302, `/catalog/search?${params.toString()}`);
  }

  return {};
};

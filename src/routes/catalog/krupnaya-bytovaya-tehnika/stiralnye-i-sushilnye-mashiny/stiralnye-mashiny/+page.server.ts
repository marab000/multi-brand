import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { findSeoLandingByPath, loadSeoLandingPage } from '$lib/server/seoLandings';

const PATH = 'krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/stiralnye-mashiny';

export const load: PageServerLoad = async ({ url, locals }) => {
  const landing = findSeoLandingByPath(PATH);
  if (!landing) throw error(404, 'Раздел не найден');
  return loadSeoLandingPage(landing, url, locals.siteOrigin);
};

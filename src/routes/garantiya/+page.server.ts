import type { PageServerLoad } from './$types';
import { getSeoOverride, safeCanonical } from '$lib/server/seoOverrides';

const DEFAULT_TITLE = 'Гарантия и поддержка | MULTIBRAND';

export const load: PageServerLoad = async ({ locals }) => {
  const o = await getSeoOverride('garantiya');
  return {
    meta: {
      title: o?.title || DEFAULT_TITLE,
      description: o?.description || undefined,
      canonical: o?.canonical ? safeCanonical(o.canonical, locals.siteOrigin) : safeCanonical('/garantiya', locals.siteOrigin)
    }
  };
};

import type { PageServerLoad } from './$types';
import { getSeoOverride, safeCanonical } from '$lib/server/seoOverrides';

const DEFAULT_TITLE = 'Гарантия и поддержка | MULTIBRAND';

export const load: PageServerLoad = async () => {
  const o = await getSeoOverride('garantiya');
  return {
    meta: {
      title: o?.title || DEFAULT_TITLE,
      description: o?.description || undefined,
      canonical: o?.canonical ? safeCanonical(o.canonical) : safeCanonical('/garantiya')
    }
  };
};

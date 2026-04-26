import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import type { Product } from '$lib/types/product';
import { isProductAllowedForFeed } from '$lib/server/feedFilters';
import { slugify } from '$lib/utils/slugify';
import { normalizePrice } from '$lib/utils/formatPrice';

type FeedProduct = Product & {
  images: {
    url: string;
    position: number;
  }[];
};

const escapeXml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const GET: RequestHandler = async ({ request }) => {
  const origin = new URL(request.url).origin;
  const products = await sql<FeedProduct[]>`
    select
      p.*,
      coalesce(
        json_agg(
          json_build_object(
            'url', pi.url,
            'position', pi.position
          )
          order by pi.position
        ) filter (where pi.url is not null),
        '[]'
      ) as images
    from products p
    left join product_images pi on pi.product_id = p.id
    group by p.id
  `;
  const withImages = products.filter((p) => p.images?.length).length;
  const withoutImages = products.length - withImages;
  const filtered = products.filter(isProductAllowedForFeed);
  console.log('[feed] products total:', products.length);
  console.log('[feed] products with images:', withImages);
  console.log('[feed] products without images:', withoutImages);
  console.log('[feed] products after filters:', filtered.length);
  const offers = filtered
    .map((p) => {
      const image = [...p.images].sort((a, b) => a.position - b.position)[0]?.url ?? '';
      const url = `${origin}/products/${slugify(p.name)}`;
      const title = escapeXml(p.name);
      const description = escapeXml(p.description ?? '');
      const price = normalizePrice(p.price_rrc);
      return `<offer>
<id>${escapeXml(p.id)}</id>
<url>${escapeXml(url)}</url>
<image>${escapeXml(image)}</image>
<title>${title}</title>
<description>${description}</description>
<price>${price}</price>
<currency>RUB</currency>
<custom_label_0>${escapeXml(p.brand?.name ?? '')}</custom_label_0>
<custom_label_1>${escapeXml(p.category ?? '')}</custom_label_1>
</offer>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<offers>${offers}</offers>`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
};

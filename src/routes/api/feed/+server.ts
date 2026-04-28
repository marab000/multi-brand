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

const csv = (value: string | number | null | undefined) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

export const GET: RequestHandler = async () => {
  const origin = 'https://multi-brand.online';
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
  const filtered = products.filter(isProductAllowedForFeed);
  const header = [
    'ID',
    'URL',
    'Image',
    'Title',
    'Description',
    'Price',
    'Currency',
    'custom_label_0',
    'custom_label_1'
  ];
  const rows = filtered.map((p) => {
    const image = [...p.images].sort((a, b) => a.position - b.position)[0]?.url ?? '';
    const url = `${origin}/products/${slugify(p.name)}`;
    return [
      p.id,
      url,
      image,
      p.name,
      p.description ?? '',
      normalizePrice(p.price_rrc),
      'RUB',
      p.brand?.name ?? '',
      p.category ?? ''
    ]
      .map(csv)
      .join(',');
  });
  const body = [header.join(','), ...rows].join('\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8'
    }
  });
};

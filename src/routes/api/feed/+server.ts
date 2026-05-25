import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import type { Product } from '$lib/types/product';
import { isProductAllowedForFeed } from '$lib/server/feedFilters';
import { slugify } from '$lib/utils/slugify';
import { normalizePrice } from '$lib/utils/formatPrice';
import { getProductPrice } from '$lib/utils/pricing';

type FeedProduct = Product & {
  images: {
    url: string;
    position: number;
  }[];
};

const origin = 'https://multi-brand.online';
const csv = (value: string | number | null | undefined) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;
const xml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function getOfferId(product: FeedProduct) {
  return product.id.replace(/[^a-zA-Z0-9_]/g, '');
}

function getMainImage(product: FeedProduct) {
  return [...product.images].sort((a, b) => a.position - b.position)[0]?.url ?? '';
}

function getProductUrl(product: FeedProduct) {
  return `${origin}/products/${slugify(product.name)}`;
}

function getFeedPrice(product: FeedProduct) {
  return normalizePrice(getProductPrice(product));
}

function buildCsv(products: FeedProduct[]) {
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
  const rows = products.map((p) =>
    [
      getOfferId(p),
      getProductUrl(p),
      getMainImage(p),
      p.name,
      p.description ?? '',
      getFeedPrice(p),
      'RUB',
      p.brand?.name ?? '',
      p.category ?? ''
    ]
      .map(csv)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

function buildYml(products: FeedProduct[]) {
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const categoryIds = new Map(categories.map((category, index) => [category, index + 1]));
  const date = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const categoryRows = categories
    .map(
      (category) => `      <category id="${categoryIds.get(category)}">${xml(category)}</category>`
    )
    .join('\n');
  const offerRows = products
    .map((p) => {
      const categoryId = p.category ? categoryIds.get(p.category) : undefined;
      return `      <offer id="${xml(getOfferId(p))}" available="true">
        <url>${xml(getProductUrl(p))}</url>
        <price>${xml(getFeedPrice(p))}</price>
        <currencyId>RUR</currencyId>
        ${categoryId ? `<categoryId>${categoryId}</categoryId>` : ''}
        <picture>${xml(getMainImage(p))}</picture>
        <name>${xml(p.name)}</name>
        ${p.brand?.name ? `<vendor>${xml(p.brand.name)}</vendor>` : ''}
        ${p.description ? `<description>${xml(p.description)}</description>` : ''}
      </offer>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${date}">
  <shop>
    <name>Multi Brand</name>
    <company>Multi Brand</company>
    <url>${origin}</url>
    <currencies>
      <currency id="RUR" rate="1"/>
    </currencies>
    <categories>
${categoryRows}
    </categories>
    <offers>
${offerRows}
    </offers>
  </shop>
</yml_catalog>`;
}

export const GET: RequestHandler = async ({ url }) => {
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
  const format = url.searchParams.get('format')?.toLowerCase();
  const isYml = format === 'yml' || format === 'xml';
  return new Response(isYml ? buildYml(filtered) : buildCsv(filtered), {
    headers: {
      'Content-Type': isYml ? 'application/xml; charset=utf-8' : 'text/csv; charset=utf-8'
    }
  });
};
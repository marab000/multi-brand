import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const idsParam = url.searchParams.get('ids')?.trim();
  if (!idsParam) return json([]);

  const ids = idsParam
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (!ids.length) return json([]);

  try {
    const rows = await sql`
      select p.id, p.name, p.description, p.brand,
             p.price_rrc, p.price_ric, p.external_id, p.raw,
             coalesce(
               json_agg(json_build_object('url', pi.url, 'position', pi.position) order by pi.position)
               filter (where pi.id is not null),
               '[]'
             ) as images
      from products p
      left join product_images pi on pi.product_id = p.id
      where p.id = ANY(${ids}::uuid[])
      group by p.id
    `;
    return json(rows);
  } catch (e) {
    console.error('BATCH ERROR:', e);
    return json([]);
  }
};

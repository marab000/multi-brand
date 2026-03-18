import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export async function GET({ url }) {
  const q = url.searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return json([]);
  }

  const products = await sql`
SELECT
p.id,
p.name,
p.brand->>'name' as brand_name,
COALESCE(p.price_ric,p.price_rrc) as price,
COALESCE(
json_agg(
json_build_object(
'url',pi.url,
'position',pi.position
)
ORDER BY pi.position
) FILTER (WHERE pi.id IS NOT NULL),
'[]'
) as images
FROM products p
LEFT JOIN product_images pi
ON pi.product_id=p.id
WHERE
lower(p.name) ILIKE ${'%' + q.toLowerCase() + '%'}
OR lower(p.brand->>'name') ILIKE ${'%' + q.toLowerCase() + '%'}
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 8
`;

  return json(products);
}

import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export async function GET({ params }) {
  const slug = params.slug;
  const product = await sql`
		select p.*,
		coalesce(
		json_agg(json_build_object('url',pi.url,'position',pi.position) order by pi.position)
		filter(where pi.id is not null),'[]') as images
		from products p
		left join product_images pi on pi.product_id=p.id
		where lower(regexp_replace(p.name,'[^a-zA-Z0-9]+','-','g'))=${slug}
		group by p.id
		limit 1
		`;
  if (!product.length) return json(null, { status: 404 });
  return json(product[0]);
}

import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

export async function GET({ params }) {
  const slug = params.slug;

  // достаём все товары с изображениями
  const products = await sql`
    select p.*,
      coalesce(
        json_agg(json_build_object('url',pi.url,'position',pi.position) order by pi.position)
        filter(where pi.id is not null), '[]'
      ) as images
    from products p
    left join product_images pi on pi.product_id=p.id
    group by p.id
  `;

  // ищем товар с нужным slug через существующий slugify
  const product = products.find((p: any) => slugify(p.name) === slug);

  if (!product) return json(null, { status: 404 });

  return json(product);
}

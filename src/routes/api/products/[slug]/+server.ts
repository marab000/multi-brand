import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

export async function GET({ params }) {
  const slug = params.slug;
  const brandGuess = slug.split('-')[0];

  let candidates = await sql`
    select p.id, p.name
    from products p
    where lower(p.name) like ${`${brandGuess.toLowerCase()}%`}
    limit 300
  `;

  let matched = candidates.find((p: any) => slugify(p.name) === slug);

  if (!matched) {
    candidates = await sql`
      select p.id, p.name
      from products p
    `;
    matched = candidates.find((p: any) => slugify(p.name) === slug);
  }

  if (!matched) return json(null, { status: 404 });

  const rows = await sql`
    select p.*,
      coalesce(
        json_agg(json_build_object('url', pi.url, 'position', pi.position) order by pi.position)
        filter(where pi.id is not null),
        '[]'
      ) as images
    from products p
    left join product_images pi on pi.product_id = p.id
    where p.id = ${matched.id}
    group by p.id
    limit 1
  `;

  if (!rows.length) return json(null, { status: 404 });

  return json(rows[0]);
}

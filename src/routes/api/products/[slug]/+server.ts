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
  const product = rows[0];
  const kitItems = await sql`
    select pki.*,
      case when cp.id is null then null else json_build_object(
        'id', cp.id,
        'external_id', cp.external_id,
        'name', cp.name,
        'description', cp.description,
        'brand', cp.brand,
        'category', cp.category,
        'product_type', cp.product_type,
        'catalog_root_slug', cp.catalog_root_slug,
        'catalog_root_name', cp.catalog_root_name,
        'catalog_group_slug', cp.catalog_group_slug,
        'catalog_group_name', cp.catalog_group_name,
        'catalog_leaf_slug', cp.catalog_leaf_slug,
        'catalog_leaf_name', cp.catalog_leaf_name,
        'price_rrc', cp.price_rrc,
        'price_opt', cp.price_opt,
        'price_ric', cp.price_ric,
        'specs', cp.specs,
        'raw', cp.raw,
        'created_at', cp.created_at,
        'updated_at', cp.updated_at,
        'images', coalesce(ci.images, '[]'::json)
      ) end as child_product,
      cp.name as child_name,
      coalesce(ci.preview_image, pki.preview_image) as image
    from product_kit_items pki
    left join products cp on cp.id = pki.child_product_id
    left join lateral (
      select json_agg(json_build_object('url', pi.url, 'position', pi.position) order by pi.position) as images,
        (array_agg(pi.url order by pi.position))[1] as preview_image
      from product_images pi
      where pi.product_id = cp.id
    ) ci on true
    where pki.kit_product_id = ${product.id}
    order by pki.position nulls last, pki.id
  `;
  const includedInKits = await sql`
    select kp.id, kp.name, kp.brand, kp.price_rrc,
      coalesce((array_agg(pi.url order by pi.position) filter(where pi.id is not null))[1], null) as image
    from product_kit_items pki
    join products kp on kp.id = pki.kit_product_id
    left join product_images pi on pi.product_id = kp.id
    where pki.child_product_id = ${product.id}
    group by kp.id
    order by kp.name
  `;
  const normalizedKitItems = kitItems.map((item: any) => ({
    ...item,
    child_slug: item.child_name ? slugify(item.child_name) : null
  }));
  const normalizedIncludedInKits = includedInKits.map((kit: any) => ({
    ...kit,
    slug: slugify(kit.name)
  }));
  const isKit =
    String(product.external_id || '').startsWith('kit:') ||
    product.raw?.imported_from === 'tetrasis-kit' ||
    product.raw?.source === 'tetrasis-kit' ||
    normalizedKitItems.length > 0;
  return json({
    ...product,
    isKit,
    kitItems: normalizedKitItems,
    includedInKits: normalizedIncludedInKits
  });
}

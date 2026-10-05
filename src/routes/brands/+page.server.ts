import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { brandSlug } from '$lib/server/seoText';

// Все бренды, у которых есть товары с ценой — для индекса /brands
export const load: PageServerLoad = async () => {
	const rows = await sql`
		select brand->>'name' as name, count(*)::int as c
		from products
		where price_rrc is not null and brand->>'name' is not null
		group by 1
		having count(*) >= 3
		order by 2 desc
	`;
	const brands = rows
		.map((r) => ({ name: r.name, count: r.c, slug: brandSlug(r.name) }))
		.filter((b) => b.slug);
	return { brands };
};

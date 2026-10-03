import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { getBrandConfig, getSyncStateView, cleanBrandName } from '$lib/server/tetrasis';

export const load: PageServerLoad = async () => {
	const [cfg, view] = await Promise.all([getBrandConfig(), getSyncStateView()]);

	// сколько товаров каждого бренда в тетрис-синке и во внешних источниках
	// (rusklimat/grandex-aqua/комплекты — тумблер Тетриса ими не управляет)
	let counts: Record<string, number> = {};
	let extCounts: Record<string, number> = {};
	try {
		const rows = await sql`
			select brand->>'name' as name,
				count(*) filter (where source = 'tetrasis-api')::int as tetris,
				count(*) filter (where source <> 'tetrasis-api')::int as external
			from products
			group by 1
		`;
		for (const r of rows) {
			if (!r.name) continue;
			const key = cleanBrandName(r.name).toLowerCase();
			counts[key] = r.tetris;
			extCounts[key] = r.external;
		}
	} catch {
		// таблицы нет — не беда
	}

	return {
		brands: cfg.all,
		enabled: cfg.enabled,
		sync: view,
		counts,
		extCounts
	};
};

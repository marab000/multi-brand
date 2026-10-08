import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { getBrandConfig, getSyncStateView, cleanBrandName, getExcludedCategories } from '$lib/server/tetrasis';
import { getImagesSyncStateView } from '$lib/server/tetrasisImages';

export const load: PageServerLoad = async () => {
	const [cfg, view, excludedCategories, imagesView] = await Promise.all([
		getBrandConfig(),
		getSyncStateView(),
		getExcludedCategories(),
		getImagesSyncStateView()
	]);

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

	// категории из живых данных + уже исключённые (даже если товаров уже нет)
	const excludedSet = new Set(excludedCategories.map((c) => c.toLowerCase()));
	const byName = new Map<string, { name: string; products: number; excluded: boolean }>();
	try {
		const catRows = await sql`
			select TRIM(category) as name, count(*)::int as n
			from products
			where source = 'tetrasis-api' and category is not null and TRIM(category) <> ''
			group by 1
		`;
		for (const r of catRows) {
			const key = String(r.name).toLowerCase();
			byName.set(key, { name: r.name, products: r.n, excluded: excludedSet.has(key) });
		}
	} catch {
		// таблицы нет — не беда
	}
	for (const c of excludedCategories) {
		const key = c.toLowerCase();
		if (!byName.has(key)) byName.set(key, { name: c, products: 0, excluded: true });
	}
	const categories = [...byName.values()].sort(
		(a, b) => b.products - a.products || a.name.localeCompare(b.name)
	);

	return {
		brands: cfg.all,
		enabled: cfg.enabled,
		categories,
		sync: view,
		images: imagesView,
		counts,
		extCounts
	};
};

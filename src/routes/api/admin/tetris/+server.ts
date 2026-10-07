import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { checkAdmin } from '$lib/server/adminAuth';
import {
	getBrandConfig,
	saveEnabledBrands,
	getSyncStateView,
	cleanBrandName,
	getExcludedCategories,
	saveExcludedCategories
} from '$lib/server/tetrasis';
import type { RequestHandler } from './$types';

// GET — конфиг брендов + категории + состояние синка + сколько товаров каждого бренда в базе
export const GET: RequestHandler = async ({ cookies, locals }) => {
	await checkAdmin(cookies, locals);
	const cfg = await getBrandConfig();
	const view = await getSyncStateView();
	const excluded = await getExcludedCategories();
	const excludedSet = new Set(excluded.map((c) => c.toLowerCase()));

	let counts: Record<string, number> = {};
	let extCounts: Record<string, number> = {};
	let catRows: Array<{ name: string; n: number }> = [];
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
		catRows = await sql`
			select TRIM(category) as name, count(*)::int as n
			from products
			where source = 'tetrasis-api' and category is not null and TRIM(category) <> ''
			group by 1
		`;
	} catch {
		// таблицы products нет — не беда
	}

	// категории генерируются из живых данных (что синкнулся — то в списке),
	// плюс уже исключённые, чтобы их можно было вернуть
	const byName = new Map<string, { name: string; products: number; excluded: boolean }>();
	for (const r of catRows) {
		const key = String(r.name).toLowerCase();
		byName.set(key, { name: r.name, products: r.n, excluded: excludedSet.has(key) });
	}
	for (const c of excluded) {
		const key = c.toLowerCase();
		if (!byName.has(key)) byName.set(key, { name: c, products: 0, excluded: true });
	}
	const categories = [...byName.values()].sort(
		(a, b) => b.products - a.products || a.name.localeCompare(b.name)
	);

	return json({
		brands: cfg.all.map((name) => ({
			name,
			enabled: cfg.enabled.some((e) => e.toLowerCase() === name.toLowerCase()),
			products: counts[name.toLowerCase()] ?? 0,
			external: extCounts[name.toLowerCase()] ?? 0
		})),
		categories,
		sync: view
	});
};

// PUT — сохранить список включённых брендов и/или исключённых категорий
export const PUT: RequestHandler = async ({ request, cookies, locals }) => {
	await checkAdmin(cookies, locals);
	const body = await request.json().catch(() => null);
	const enabled = body?.enabled;
	const excludedCategories = body?.excludedCategories;
	if (!Array.isArray(enabled) && !Array.isArray(excludedCategories)) {
		throw error(400, 'Нужен массив enabled и/или excludedCategories');
	}
	if (enabled !== undefined) {
		if (!Array.isArray(enabled) || !enabled.every((x: any) => typeof x === 'string')) {
			throw error(400, 'enabled должен быть массивом строк');
		}
		if (enabled.length > 300) throw error(400, 'Слишком много брендов');
	}
	if (
		excludedCategories !== undefined &&
		(!Array.isArray(excludedCategories) ||
			!excludedCategories.every((x: any) => typeof x === 'string') ||
			excludedCategories.length > 200)
	) {
		throw error(400, 'excludedCategories должен быть массивом строк (до 200)');
	}
	if (Array.isArray(enabled)) await saveEnabledBrands(enabled);
	if (Array.isArray(excludedCategories)) await saveExcludedCategories(excludedCategories);
	return json({
		ok: true,
		enabled: enabled === undefined ? undefined : (await getBrandConfig()).enabled,
		excludedCategories:
			excludedCategories === undefined ? undefined : await getExcludedCategories()
	});
};

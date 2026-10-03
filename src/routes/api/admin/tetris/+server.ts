import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { checkAdmin } from '$lib/server/adminAuth';
import {
	getBrandConfig,
	saveEnabledBrands,
	getSyncStateView,
	cleanBrandName
} from '$lib/server/tetrasis';
import type { RequestHandler } from './$types';

// GET — конфиг брендов + состояние синка + сколько товаров каждого бренда в базе
export const GET: RequestHandler = async ({ cookies, locals }) => {
	await checkAdmin(cookies, locals);
	const cfg = await getBrandConfig();
	const view = await getSyncStateView();

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
		// таблицы products нет — не беда
	}

	return json({
		brands: cfg.all.map((name) => ({
			name,
			enabled: cfg.enabled.some((e) => e.toLowerCase() === name.toLowerCase()),
			products: counts[name.toLowerCase()] ?? 0,
			external: extCounts[name.toLowerCase()] ?? 0
		})),
		sync: view
	});
};

// PUT — сохранить список включённых брендов
export const PUT: RequestHandler = async ({ request, cookies, locals }) => {
	await checkAdmin(cookies, locals);
	const body = await request.json().catch(() => null);
	const enabled = body?.enabled;
	if (!Array.isArray(enabled) || !enabled.every((x: any) => typeof x === 'string')) {
		throw error(400, 'enabled должен быть массивом строк');
	}
	if (enabled.length > 300) throw error(400, 'Слишком много брендов');
	const cfg = await saveEnabledBrands(enabled);
	return json({ ok: true, enabled: cfg.enabled });
};

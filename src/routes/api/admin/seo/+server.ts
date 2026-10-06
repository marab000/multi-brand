import { json, error } from '@sveltejs/kit';
import { checkSeoAccess } from '$lib/server/adminAuth';
import { listSeoOverrides, upsertSeoOverride, safeCanonical } from '$lib/server/seoOverrides';

// Справочник редактируемых страниц (page_key → человекочитаемое имя)
export async function GET({ cookies, locals, url }) {
	await checkSeoAccess(cookies, locals);
	const { buildSeoPageList } = await import('$lib/server/seoPages');
	const pages = await buildSeoPageList();
	const overrides = await listSeoOverrides(pages.map((p) => p.key));
	return json({
		pages: pages.map((p) => ({ ...p, override: overrides[p.key] ?? null }))
	});
}

// Сохранение одной страницы
export async function PUT({ request, cookies, locals }) {
	await checkSeoAccess(cookies, locals);
	const body = await request.json().catch(() => null);
	const key = typeof body?.pageKey === 'string' ? body.pageKey.trim() : '';
	if (!key) throw error(400, 'Не указана страница');
	const { buildSeoPageList } = await import('$lib/server/seoPages');
	const known = await buildSeoPageList();
	if (!known.some((p) => p.key === key)) throw error(400, 'Неизвестная страница');

	const who =
		locals.user?.email ?? `admin#${cookies.get('admin_session') ?? '?'}`;
	await upsertSeoOverride(key, {
		title: typeof body.title === 'string' ? body.title : null,
		description: typeof body.description === 'string' ? body.description : null,
		h1: typeof body.h1 === 'string' ? body.h1 : null,
		canonical: typeof body.canonical === 'string' ? body.canonical : null
	}, who);
	return json({ ok: true, canonical: safeCanonical(body.canonical) });
}

import { json } from '@sveltejs/kit';
import { checkSeoAccess } from '$lib/server/adminAuth';
import { getMetaTemplates, saveMetaTemplates, DEFAULT_TEMPLATES } from '$lib/server/metaTemplates';

export async function GET({ cookies, locals }) {
	await checkSeoAccess(cookies, locals);
	return json({ templates: await getMetaTemplates(), defaults: DEFAULT_TEMPLATES });
}

export async function PUT({ request, cookies, locals }) {
	await checkSeoAccess(cookies, locals);
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') return json({ message: 'Пустой запрос' }, { status: 400 });
	const pick = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
	const saved = await saveMetaTemplates({
		product_title: pick(body.product_title),
		product_description: pick(body.product_description),
		subcategory_title: pick(body.subcategory_title),
		subcategory_description: pick(body.subcategory_description)
	});
	return json({ ok: true, templates: saved });
}

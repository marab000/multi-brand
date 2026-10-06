import type { PageServerLoad } from './$types';
import { checkSeoAccess } from '$lib/server/adminAuth';
import { buildSeoPageList } from '$lib/server/seoPages';
import { listSeoOverrides } from '$lib/server/seoOverrides';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	await checkSeoAccess(cookies, locals);
	const pages = await buildSeoPageList();
	const overrides = await listSeoOverrides(pages.map((p) => p.key));
	return {
		pages: pages.map((p) => ({
			...p,
			override: overrides[p.key] ?? null
		}))
	};
};

import { checkSeoAccess } from '$lib/server/adminAuth';
import { buildSeoPageList } from '$lib/server/seoPages';
import { listSeoOverrides } from '$lib/server/seoOverrides';

const csvCell = (value: string | null | undefined) => {
	const s = (value ?? '').replace(/\r?\n/g, '\\n');
	return `"${s.replace(/"/g, '""')}"`;
};

// Экспорт всех SEO-редактируемых страниц в CSV (; с BOM, открывается в Excel/Google Sheets).
// page_key — стабильный идентификатор: импорт мапит строки обратно по нему.
export async function GET({ cookies, locals }) {
	await checkSeoAccess(cookies, locals);
	const pages = await buildSeoPageList();
	const overrides = await listSeoOverrides(pages.map((p) => p.key));

	const header = 'page_key;url;title;description;h1;section_text';
	const rows = pages.map((p) => {
		const o = overrides[p.key];
		return [
			p.key,
			p.path,
			o?.title ?? '',
			o?.description ?? '',
			o?.h1 ?? '',
			o?.section_text ?? ''
		]
			.map(csvCell)
			.join(';');
	});
	// BOM, чтобы Excel не показывал кириллицу кракозябрами
	const body = '\uFEFF' + [header, ...rows].join('\r\n');
	return new Response(body, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="seo-pages.csv"',
			'Cache-Control': 'no-store'
		}
	});
}

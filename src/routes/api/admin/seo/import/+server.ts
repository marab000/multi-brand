import { json, error } from '@sveltejs/kit';
import { checkSeoAccess } from '$lib/server/adminAuth';
import { buildSeoPageList } from '$lib/server/seoPages';
import { listSeoOverrides, upsertSeoOverride } from '$lib/server/seoOverrides';

// Парсер CSV: кавычки "", экранированные \n, разделитель ; или auto (первая строка)
function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let inQuotes = false;
	const delim = (text.split('\n')[0].match(/;/g)?.length ?? 0) >= (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					cell += '"';
					i++;
				} else inQuotes = false;
			} else cell += ch;
		} else if (ch === '"') {
			inQuotes = true;
		} else if (ch === delim) {
			row.push(cell);
			cell = '';
		} else if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && text[i + 1] === '\n') i++;
			row.push(cell);
			cell = '';
			if (row.some((c) => c !== '')) rows.push(row);
			row = [];
		} else cell += ch;
	}
	row.push(cell);
	if (row.some((c) => c !== '')) rows.push(row);
	return rows;
}

const unescape = (s: string) => s.replace(/\\n/g, '\n').trim();

/** Массовый импорт SEO: CSV с колонкой page_key (как в экспорте).
 *  Пустая ячейка = поле не трогаем. Лимит 3 МБ. */
export async function POST({ request, cookies, locals }) {
	await checkSeoAccess(cookies, locals);
	const form = await request.formData().catch(() => null);
	const file = form?.get('file');
	if (!(file instanceof File)) throw error(400, 'Файл не передан');
	if (file.size > 3 * 1024 * 1024) throw error(400, 'Файл больше 3 МБ');

	const text = await file.text();
	const rows = parseCsv(text.replace(/^\uFEFF/, ''));
	if (rows.length < 2) throw error(400, 'В файле нет строк с данными');

	const header = rows[0].map((h) => unescape(h).toLowerCase());
	const col = (name: string) => header.indexOf(name);
	const keyIdx = col('page_key');
	const urlIdx = col('url');
	if (keyIdx === -1 && urlIdx === -1)
		throw error(400, 'Нужна колонка page_key или url (сделайте экспорт и заполните его)');
	const titleIdx = col('title');
	const descIdx = col('description');
	const h1Idx = col('h1');
	const sectionIdx = col('section_text');

	const pages = await buildSeoPageList();
	const known = new Map(pages.map((p) => [p.key, p]));
	const byPath = new Map(pages.map((p) => [p.path.replace(/\/$/, ''), p.key]));

	const who = locals.user?.email ?? `admin#${cookies.get('admin_session') ?? '?'}`;
	let updated = 0;
	const errors: string[] = [];

	for (const row of rows.slice(1)) {
		// мапим строку по page_key, при его отсутствии — по url страницы
		let key = keyIdx >= 0 ? unescape(row[keyIdx] ?? '') : '';
		if (!key && urlIdx >= 0) {
			const path = unescape(row[urlIdx] ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '');
			key = byPath.get(path) ?? '';
		}
		if (!key) continue;
		if (!known.has(key)) {
			errors.push(`${key}: неизвестная страница`);
			continue;
		}
		const data = {
			title: titleIdx >= 0 && unescape(row[titleIdx] ?? '') !== '' ? unescape(row[titleIdx]) : undefined,
			description:
				descIdx >= 0 && unescape(row[descIdx] ?? '') !== '' ? unescape(row[descIdx]) : undefined,
			h1: h1Idx >= 0 && unescape(row[h1Idx] ?? '') !== '' ? unescape(row[h1Idx]) : undefined,
			section_text:
				sectionIdx >= 0 && unescape(row[sectionIdx] ?? '') !== ''
					? unescape(row[sectionIdx])
					: undefined
		};
		if (data.title === undefined && data.description === undefined && data.h1 === undefined && data.section_text === undefined) continue;
		try {
			// пустые ячейки = «не менять»: мержим с текущей записью, а не затираем
			const existing = (await listSeoOverrides([key]))[key];
			await upsertSeoOverride(
				key,
				{
					title: data.title ?? existing?.title ?? null,
					description: data.description ?? existing?.description ?? null,
					h1: data.h1 ?? existing?.h1 ?? null,
					canonical: existing?.canonical ?? null,
					section_text: data.section_text ?? existing?.section_text ?? null
				},
				who
			);
			updated++;
		} catch (e) {
			errors.push(`${key}: ${e instanceof Error ? e.message : 'ошибка записи'}`);
		}
	}
	return json({ ok: errors.length === 0, updated, errors: errors.slice(0, 20) });
}

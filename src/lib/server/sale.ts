import { sql } from '$lib/db';

// Акции Тетриса: scripts/fetch-tetrasis-sale/fetch.js пишет наши акции
// (матчинг по брендам) в settings.tetrasis_sale. Крон обновляет ежедневно.
export type SalePromo = {
	slug: string;
	headline: string;
	brand: string | null;
	url: string | null;
	image: string | null;
	dateText: string | null;
	descriptionHtml: string;
	/** Описание, превращённое в читаемый текст (болд-каша исходной разметки Тетриса не нужна). */
	descriptionText: string;
};

export type SaleData = {
	updatedAt: string | null;
	promos: SalePromo[];
};

// исходная разметка Тетриса — это куски текста в <b>/<span> вперемешку с <br>;
// вместо неё берём чистый текст: блочные теги и <br> → перенос строки, остальное срезаем
function htmlToText(html: string): string {
	const text = String(html || '')
		.replace(/<(script|style)[\s\S]*?<\/(script|style)>/gi, ' ')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
		.replace(/<li[^>]*>/gi, '• ')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		// сжимаем пустые строки и пробелы по краям строк
		.split('\n')
		.map((l) => l.replace(/[ \t]+/g, ' ').trim())
		.filter((l, i, arr) => l.length > 0 || (i > 0 && arr[i - 1].length > 0))
		.join('\n')
		.trim();
	return text;
}

export async function getSale(): Promise<SaleData> {
	try {
		const rows = await sql`select value from settings where key = 'tetrasis_sale' limit 1`;
		if (!rows.length) return { updatedAt: null, promos: [] };
		const parsed = JSON.parse(rows[0].value);
		const promos: SalePromo[] = Array.isArray(parsed.promos) ? parsed.promos : [];
		return {
			updatedAt: parsed.updated_at ?? null,
			promos: promos.map((p) => ({ ...p, descriptionText: htmlToText(p.descriptionHtml) }))
		};
	} catch {
		return { updatedAt: null, promos: [] };
	}
}

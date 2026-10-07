import { sql } from '$lib/db';

// Ручные SEO-переопределения страниц: title / description / h1 / canonical
// и section_text — персональный текст спойлера «О разделе» для категорий.
// page_key — стабильный идентификатор страницы:
//   home, about, contacts, delivery, privacy, offer, garantiya, podbor,
//   category:{rootSlug}[/{groupSlug}[/{leafSlug}]], brand:{brandSlug}, article:{slug}

export type SeoOverride = {
	title?: string | null;
	description?: string | null;
	h1?: string | null;
	canonical?: string | null;
	section_text?: string | null;
};

let tableReady = false;

export async function ensureSeoTable(): Promise<void> {
	if (tableReady) return;
	await sql`
		CREATE TABLE IF NOT EXISTS seo_overrides (
			page_key TEXT PRIMARY KEY,
			title TEXT,
			description TEXT,
			h1 TEXT,
			canonical TEXT,
			updated_at TIMESTAMPTZ DEFAULT now(),
			updated_by TEXT
		)
	`;
	// персональный текст спойлера «О разделе» (абзацы через пустую строку)
	await sql`ALTER TABLE seo_overrides ADD COLUMN IF NOT EXISTS section_text TEXT`;
	tableReady = true;
}

export async function getSeoOverride(pageKey: string): Promise<SeoOverride | null> {
	try {
		await ensureSeoTable();
		const rows = await sql`
			SELECT title, description, h1, canonical, section_text
			FROM seo_overrides
			WHERE page_key = ${pageKey}
			LIMIT 1
		`;
		if (!rows.length) return null;
		const r = rows[0];
		const out: SeoOverride = {
			title: r.title ?? null,
			description: r.description ?? null,
			h1: r.h1 ?? null,
			canonical: r.canonical ?? null,
			section_text: r.section_text ?? null
		};
		return out.title || out.description || out.h1 || out.canonical || out.section_text
			? out
			: null;
	} catch {
		return null;
	}
}

/** Каноникл из админки: только внутри нашего домена, иначе игнор */
export function safeCanonical(raw: string | null | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;
	const full = value.startsWith('http') ? value : `https://multi-brand.online${value.startsWith('/') ? '' : '/'}${value}`;
	return full.startsWith('https://multi-brand.online') ? full : null;
}

export async function upsertSeoOverride(
	pageKey: string,
	data: SeoOverride,
	updatedBy: string
): Promise<void> {
	await ensureSeoTable();
	const title = data.title?.trim() || null;
	const description = data.description?.trim() || null;
	const h1 = data.h1?.trim() || null;
	const canonical = safeCanonical(data.canonical);
	const sectionText = data.section_text?.trim() || null;
	await ensureSeoTable();
	await sql`
		INSERT INTO seo_overrides (page_key, title, description, h1, canonical, section_text, updated_by)
		VALUES (${pageKey}, ${title}, ${description}, ${h1}, ${canonical}, ${sectionText}, ${updatedBy})
		ON CONFLICT (page_key) DO UPDATE SET
			title = ${title},
			description = ${description},
			h1 = ${h1},
			canonical = ${canonical},
			section_text = ${sectionText},
			updated_at = now(),
			updated_by = ${updatedBy}
	`;
}

export async function listSeoOverrides(pageKeys: string[]): Promise<Record<string, SeoOverride>> {
	if (!pageKeys.length) return {};
	try {
		await ensureSeoTable();
		const rows = await sql`
			SELECT page_key, title, description, h1, canonical, section_text
			FROM seo_overrides
			WHERE page_key IN ${sql(pageKeys)}
		`;
		const out: Record<string, SeoOverride> = {};
		for (const r of rows) {
			out[r.page_key] = {
				title: r.title ?? null,
				description: r.description ?? null,
				h1: r.h1 ?? null,
				canonical: r.canonical ?? null,
				section_text: r.section_text ?? null
			};
		}
		return out;
	} catch {
		return {};
	}
}

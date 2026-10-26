import { sql } from '$lib/db';
import { replaceCityPlaceholders, requestCity } from '$lib/server/cityPlaceholders';

// Шаблоны авто-мета-тегов для товаров и подкатегорий. Сеошник задаёт шаблон с
// переменными в /admin/seo → «Шаблоны», мета-теги всех страниц типа генерируются
// из него. Ручные записи в seo_overrides всегда сильнее шаблона.
//
// Переменные шаблона: {название} {тип} {бренд} {цена} — товары,
// {категория} — подкатегории, {город}/{города}/{городе} и прямые {Москва}... —
// город (на основном сайте Казань).

export type MetaTemplateKind = 'product' | 'subcategory' | 'brand';

export type MetaTemplates = Record<
	`${MetaTemplateKind}_title` | `${MetaTemplateKind}_description`,
	string
>;

// {store_name} — константа (сеошник использует в каждом шаблоне)
export const STORE_NAME = 'Мультибренд';

export const DEFAULT_TEMPLATES: MetaTemplates = {
	product_title: '{название} | MULTIBRAND',
	product_description:
		'{тип} {бренд} в {городе}. {название} — цена {цена}, доставка и гарантия. Купить в интернет-магазине MULTIBRAND.',
	subcategory_title: '{категория} купить в {городе} | Мультибренд',
	subcategory_description:
		'{категория} в {городе}: цены, характеристики, наличие. Доставка, гарантия, помощь в подборе. Купить в интернет-магазине Мультибренд.',
	brand_title: 'Бытовая техника {бренд} — купить в {городе} | Мультибренд',
	brand_description:
		'Техника {бренд} в каталоге Мультибренд: модели, характеристики и цены. Выберите товары {бренд} с доставкой в {городе}.'
};

const SETTINGS_KEY = 'seo_meta_templates';

export async function getMetaTemplates(): Promise<MetaTemplates> {
	try {
		const rows = await sql`select value from settings where key = ${SETTINGS_KEY} limit 1`;
		const stored = rows.length ? JSON.parse(rows[0].value) : null;
		return { ...DEFAULT_TEMPLATES, ...(stored ?? {}) };
	} catch {
		return { ...DEFAULT_TEMPLATES };
	}
}

export async function saveMetaTemplates(tpl: Partial<MetaTemplates>): Promise<MetaTemplates> {
	const merged = { ...(await getMetaTemplates()), ...tpl };
	const json = JSON.stringify(merged);
	await sql`
		insert into settings (key, value, updated_at)
		values (${SETTINGS_KEY}, ${json}, now())
		on conflict (key) do update set value = ${json}, updated_at = now()
	`;
	return merged;
}

// алиасы переменных из ТЗ сеошника: латиница → наши ключи (кириллица)
const VAR_ALIASES: Record<string, string> = {
	brand: 'бренд',
	model: 'модель',
	product_name: 'название',
	category_name: 'категория',
	page_name: 'категория'
};

/** Подставляет переменные шаблона + городовые плейсхолдеры. Неизвестные {скобки} не трогает. */
export function applyMetaTemplate(
	template: string,
	vars: Record<string, string | number | null | undefined>
): string {
	const withVars = template.replace(/\{([а-яёa-z_-]+)\}/gi, (whole, rawKey: string) => {
		const key = VAR_ALIASES[rawKey.toLowerCase()] ?? rawKey.toLowerCase();
		if (key === 'store_name') return STORE_NAME;
		if (!(key in vars)) return whole;
		const value = vars[key];
		return value == null || value === '' ? whole : String(value);
	});
	return replaceCityPlaceholders(withVars, requestCity());
}

export function formatPriceRub(priceThousands: number | null | undefined): string {
	if (priceThousands == null) return '';
	return `${Math.round(Number(priceThousands) * 1000).toLocaleString('ru-RU')} ₽`;
}

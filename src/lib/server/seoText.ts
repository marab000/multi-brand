// SEO-тексты для страниц категорий каталога.
// Генерируются из реальных данных категории (кол-во товаров, бренды, цены)
// по набору шаблонов. Выбор шаблона детерминирован slug'ом — текст на странице
// стабильный между загрузками (для поисковика), но у разных категорий разный.

export type CategorySeoStats = {
	name: string;
	count: number;
	brands: string[];
	minPrice: number | null; // в рублях
	maxPrice: number | null; // в рублях
};

export type CategorySeo = { heading: string; paragraphs: string[] };

function seed(str: string): number {
	let h = 0;
	for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
	return h;
}

function pick<T>(arr: T[], s: number): T {
	return arr[s % arr.length];
}

function plural(n: number, one: string, few: string, many: string): string {
	const m10 = n % 10;
	const m100 = n % 100;
	if (m10 === 1 && m100 !== 11) return one;
	if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
	return many;
}

const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);

export function buildCategorySeo(stats: CategorySeoStats): CategorySeo | null {
	if (stats.count < 3) return null;
	const s = seed(stats.name);

	const price =
		stats.minPrice != null && stats.maxPrice != null && stats.maxPrice > stats.minPrice
			? `Цены — от ${fmt(stats.minPrice)} до ${fmt(stats.maxPrice)} ₽`
			: stats.minPrice != null
				? `Цены — от ${fmt(stats.minPrice)} ₽`
				: null;

	const countWord = plural(stats.count, 'товар', 'товара', 'товаров');
	const p1 =
		`${price ? price + '. ' : ''}В разделе собран ${fmt(stats.count)} ${countWord}` +
		` категории «${stats.name}» — все позиции в наличии на складе в Казани или под заказ с доставкой за 7 дней.`;

	const brandList = stats.brands.slice(0, 6).join(', ');
	const p2Variants = [
		`В ассортименте — техника брендов ${brandList}. Все товары приходят по официальным поставкам, гарантия производителя сохраняется полностью.`,
		`Собрали модели ${brandList} в одном разделе, чтобы удобно было сравнить характеристики и цены — от недорогих решений до премиальных.`,
		`Основные бренды раздела: ${brandList}. Это официальные поставки с сервисной поддержкой, а не серый импорт.`
	];
	const p2 = stats.brands.length >= 2 ? pick(p2Variants, s) : null;

	const p3Variants = [
		'Доставим по Казани бесплатно, отправим в любой регион России. Действует рассрочка 0% на 12 месяцев — без переплат и скрытых комиссий.',
		'Поможем с выбором: подскажем по размерам, совместимости и комплектации. Консультант на связи ежедневно с 9:00 до 21:00.',
		'Можно оформить рассрочку 0% на 12 месяцев, а технику — бесплатно хранить на нашем складе, пока идёт ремонт.'
	];
	const p3 = pick(p3Variants, s >> 3);

	const paragraphs = [p1, ...(p2 ? [p2] : []), p3].filter(Boolean);
	return {
		heading: `«${stats.name}» — купить в Казани с доставкой и гарантией`,
		paragraphs
	};
}

// ─── Бренды ───

export { brandSlug } from '$lib/utils/slugify';

export type BrandSeoStats = {
	name: string;
	count: number;
	minPrice: number | null; // в рублях
	maxPrice: number | null; // в рублях
	roots: string[]; // названия корневых разделов, где представлен бренд
};

export function buildBrandSeo(stats: BrandSeoStats): CategorySeo | null {
	if (stats.count < 3) return null;
	const s = seed(stats.name);

	const price =
		stats.minPrice != null && stats.maxPrice != null && stats.maxPrice > stats.minPrice
			? `Цены — от ${fmt(stats.minPrice)} до ${fmt(stats.maxPrice)} ₽`
			: stats.minPrice != null
				? `Цены — от ${fmt(stats.minPrice)} ₽`
				: null;

	const countWord = plural(stats.count, 'товар', 'товара', 'товаров');
	const p1 =
		`${price ? price + '. ' : ''}${stats.name} в каталоге «Мультибренд» — ${fmt(stats.count)} ${countWord}` +
		` в наличии на складе в Казани или под заказ с доставкой за 7 дней. Официальные поставки, гарантия производителя.`;

	const rootsList = stats.roots.slice(0, 5).join(', ');
	const p2Variants = [
		`В разделе представлено оборудование ${stats.name}: ${rootsList} и сопутствующие позиции. Поможем собрать комплект под кухню или проект в одном стиле.`,
		`Основные направления: ${rootsList}. Подберём модель под ваши размеры, интерьер и бюджет — консультант знает ассортимент ${stats.name} в detail.`.replace(' в detail', ''),
		`Ассортимент охватывает категории: ${rootsList}. Техника привезена официально, с сервисной поддержкой на территории России.`
	];
	const p2 = stats.roots.length >= 2 ? pick(p2Variants, s) : null;

	const p3Variants = [
		'Доставим по Казани бесплатно, отправим в любой регион России. Рассрочка 0% на 12 месяцев — оформление онлайн за 15 минут.',
		'Все товары ${brand} можно увидеть вживую в нашем салоне на Чистопольской, 66, в Казани. Ежедневно с 9:00 до 21:00.'.replace(
			'${brand}',
			stats.name
		),
		'Поможем подобрать модель под задачи: подскажем по габаритам, совместимости и комплектации. Консультант на связи ежедневно.'
	];
	const p3 = pick(p3Variants, s >> 3);

	const paragraphs = [p1, ...(p2 ? [p2] : []), p3].filter(Boolean);
	return {
		heading: `${stats.name} — купить в Казани с доставкой и гарантией`,
		paragraphs
	};
}

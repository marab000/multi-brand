import { replaceCityPlaceholders, requestCity } from '$lib/server/cityPlaceholders';

// Правило мета-тегов: если в seo_overrides заполнен H1, а title/description не заданы,
// мета собирается из H1 автоматически (для GEO-разделов сеошника задаём только H1 + текст).
// Цепочка приоритета на странице: title из seo_overrides → из H1 → шаблон → автоген.

export function titleFromH1(h1: string | null | undefined): string | null {
	const clean = h1?.trim();
	if (!clean) return null;
	// {city_in} — «в Казани», предлог внутри плейсхолдера
	return replaceCityPlaceholders(`${clean} {city_in} — купить | Multi Brand`, requestCity());
}

export function descriptionFromH1(h1: string | null | undefined): string | null {
	const clean = h1?.trim();
	if (!clean) return null;
	return replaceCityPlaceholders(
		`${clean} {city_in} — каталог с ценами и характеристиками. Покупка в рассрочку, доставка и гарантия магазина.`,
		requestCity()
	);
}

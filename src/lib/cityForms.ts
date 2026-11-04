// Формы города для текстов — клиент-безопасный модуль (без серверных импортов).
// Город поддомена приходит через $page.data.city / locals.city; неизвестное значение
// и основной домен = Казань. Адреса магазинов/складов сюда не входят — они казанские
// и в городификации не участвуют (решение 04.11.2026: показываем как есть).

export type CityForms = { nom: string; gen: string; dat: string; prep: string; acc: string };

export const CITIES: Record<string, CityForms> = {
	Казань: { nom: 'Казань', gen: 'Казани', dat: 'Казани', prep: 'Казани', acc: 'Казань' },
	Москва: { nom: 'Москва', gen: 'Москвы', dat: 'Москве', prep: 'Москве', acc: 'Москву' },
	Уфа: { nom: 'Уфа', gen: 'Уфы', dat: 'Уфе', prep: 'Уфе', acc: 'Уфу' }
};

export const DEFAULT_CITY = 'Казань';

export function cityForms(city?: string): CityForms {
	return CITIES[city ?? ''] ?? CITIES[DEFAULT_CITY];
}

/** Регион при городе в дательном падеже: «и Республике Татарстан» — только у Казани */
export function regionDat(city?: string): string {
	return cityForms(city).nom === 'Казань' ? ' и Республике Татарстан' : '';
}

/** Краткий регион: «и РТ» — только у Казани */
export function regionShort(city?: string): string {
	return cityForms(city).nom === 'Казань' ? ' и РТ' : '';
}

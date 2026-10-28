// Подстановка города в SEO-тексты: сеошник пишет {Москва}, {Москве}, {Москвы}
// (или нейтральные {город}, {города}, {городе}) в любом падеже, при отдаче страницы
// скобка заменяется на город поддомена; на основном домене город = Казань.
// Поддомены (msk./ufa.) на этапе Phase 0 ещё не включены — currentCityFromHost уже
// готова к ним, надо будет только включить в +layout.server.ts чтение хоста.

export type CityForms = { nom: string; gen: string; dat: string; prep: string; acc: string };

export const CITIES: Record<string, CityForms> = {
	Казань: { nom: 'Казань', gen: 'Казани', dat: 'Казани', prep: 'Казани', acc: 'Казань' },
	Москва: { nom: 'Москва', gen: 'Москвы', dat: 'Москве', prep: 'Москве', acc: 'Москву' },
	Уфа: { nom: 'Уфа', gen: 'Уфы', dat: 'Уфе', prep: 'Уфе', acc: 'Уфу' }
};

export const DEFAULT_CITY = 'Казань';

// контекст текущего запроса: город поддомена. hooks.server.ts оборачивает resolve,
// getSeoOverride читает город отсюда — вызовам по всему сайту город не пробрасывается
import { AsyncLocalStorage } from 'node:async_hooks';
export const cityContext = new AsyncLocalStorage<{ city: string }>();

/** Город текущего запроса (из контекста hooks) или дефолт */
export function requestCity(): string {
	return cityContext.getStore()?.city ?? DEFAULT_CITY;
}

/** Город по хосту: msk. → Москва, ufa. → Уфа, остальное (включая localhost) → Казань */
export function currentCityFromHost(host: string | null | undefined): string {
	const h = (host ?? '').toLowerCase();
	if (h.startsWith('msk.')) return 'Москва';
	if (h.startsWith('ufa.')) return 'Уфа';
	return DEFAULT_CITY;
}

type TokenRef = keyof CityForms;

// токен = слово внутри {} в нижнем регистре. Важный момент: скобка задаёт только ПАДЕЖ,
// город всегда подставляется текущий (на основном домене Казань, на msk. Москва и т.д.),
// поэтому {Москве} на основном сайте превращается в «Казани», а на msk. остаётся «Москве»
const TOKENS: Record<string, TokenRef> = (() => {
	const t: Record<string, TokenRef> = {};
	for (const forms of Object.values(CITIES)) {
		for (const [form, word] of Object.entries(forms) as [TokenRef, string][]) {
			t[word.toLowerCase()] = form;
		}
	}
	t['город'] = 'nom';
	t['города'] = 'gen';
	t['городу'] = 'dat';
	t['городе'] = 'prep';
	t['городвин'] = 'acc';
	// алиасы из ТЗ сеошника ({city_in} = «в Москве» с предлогом, см. case в replace)
	t['city'] = 'nom';
	t['city_gen'] = 'gen';
	t['city_in'] = 'prep';
	t['city_to'] = 'acc';
	return t;
})();

/**
 * Заменяет городовые плейсхолдеры в тексте.
 * Скобка задаёт только падеж ({Москве}, {Уфе}, {городе} — всё предложный), город
 * подставляется текущий. Алиасы сеошника: {city}, {city_gen} (родительный),
 * {city_in} («в Москве», с предлогом), {city_to} («в Москву», винительный).
 * Незнакомые {скобки} не трогаем, чтобы опечатка не молча ломала текст.
 */
export function replaceCityPlaceholders(
	text: string | null | undefined,
	currentCity: string = DEFAULT_CITY
): string {
	if (!text || !text.includes('{')) return text ?? '';
	const city = CITIES[currentCity] ?? CITIES[DEFAULT_CITY];
	return text.replace(/\{([а-яёa-z_-]+)\}/gi, (whole, word: string) => {
		const form = TOKENS[word.toLowerCase()];
		if (!form) return whole;
		if (form === 'prep' && word.toLowerCase() === 'city_in') return `в ${city.prep}`;
		if (form === 'acc' && word.toLowerCase() === 'city_to') return `в ${city.acc}`;
		return city[form];
	});
}

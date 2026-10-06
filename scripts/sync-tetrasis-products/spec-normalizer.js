// Нормализатор характеристик Тетриса: чистит ключи specs от мусора и дублей.
// Используется синком (scripts/sync-tetrasis-products/sync.js) и разовым скриптом normalize-specs.mjs.
// Итерации: правим правила здесь → dry-run normalize-specs.mjs → сверяем отчёт → го на запись.

// Ключи, которые вообще не нужны на сайте (упаковка — для оптовиков, ссылка — не характеристика)
const DROP_PATTERNS = [
	/^Размер в упаковке/,
	/^Ссылка на сайт производителя/i
];

// Дубли форматов → канонический ключ:
// «Размер (Высота), см», «Размер (Высота), см*», «Размер (Высота), см (Общие)», «Высота прибора» → «Размер (Высота)»
const CANONICAL_RULES = [
	[/^Размер \(Высота\)(?:, см)?\*?(?: \(Общие\))?$/i, 'Размер (Высота)'],
	[/^Размер \(Ширина\)(?:, см)?\*?$/i, 'Размер (Ширина)'],
	[/^Размер \(Глубина\)(?:, см)?\*?$/i, 'Размер (Глубина)'],
	[/^Высота прибора$/i, 'Размер (Высота)'],
	[/^Ширина прибора$/i, 'Размер (Ширина)'],
	[/^Глубина прибора$/i, 'Размер (Глубина)']
];

// Единица в ключе при булевом значении: «Отложенный старт, ч» = «есть» → «Отложенный старт».
// Единица переносится в значение, поэтому группа захватывающая.
const UNIT_SUFFIX = /^(.+), (см|мм|кг|г|л|мл|ч|мин|дБ|Вт|кВт|об\/мин|программ)$/i;

const SIZE_KEY = /^Размер \((Высота|Ширина|Глубина)\)$/;
const BOOLEAN_VALUE = /^(?:да|есть|нет)$/i;

export function normalizeSpecKey(key) {
	const k = String(key).trim();
	if (DROP_PATTERNS.some((re) => re.test(k))) return { drop: true };
	for (const [re, canon] of CANONICAL_RULES) if (re.test(k)) return { key: canon };
	const unit = k.match(UNIT_SUFFIX);
	if (unit) return { key: unit[1].trim(), unit: unit[2] };
	return { key: k };
}

const NUMERIC = /^\d+([.,]\d+)?$/;

export function normalizeSpecValue(key, value, unit) {
	// Размеры: «81,5» → «81,5 см» (единица живёт в значении, ключ без неё)
	if (SIZE_KEY.test(key) && !/см|мм/i.test(String(value))) return `${value} см`;
	// Сняли единицу с ключа («Мощность подключения, Вт») — дописываем её в число («2400» → «2400 Вт»)
	if (unit && NUMERIC.test(String(value).trim()) && !String(value).includes(unit)) return `${value} ${unit}`;
	return value;
}

// Возвращает { specs, dropped, merged, renamed } — списки для отчёта.
export function normalizeSpecs(specs) {
	const out = {};
	const dropped = [], merged = [], renamed = [];
	for (const [origKey, origValue] of Object.entries(specs ?? {})) {
		const rule = normalizeSpecKey(origKey);
		if (rule.drop) { dropped.push([origKey, origValue]); continue; }
		const key = rule.key;
		const value = normalizeSpecValue(key, origValue, rule.unit);
		if (key !== origKey) renamed.push([origKey, key]);
		if (key in out) { merged.push([origKey, key]); continue; } // канонический ключ уже записан
		out[key] = value;
	}
	return { specs: out, dropped, merged, renamed };
}

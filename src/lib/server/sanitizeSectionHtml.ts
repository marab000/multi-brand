// Санитайзер для section_text с HTML-разметкой (GEO-тексты сеошника).
// Текст приходит из seo_overrides (админка / лоадер), поэтому чистим при отдаче:
// whitelist тегов + единственный разрешённый атрибут href, только относительные
// ссылки нашего сайта. Всё остальное (скрипты, стили, внешние href, обработчики)
// вырезается — {@html} на странице получает заведомо безопасную разметку.

const ALLOWED_TAGS = new Set([
	'p',
	'h2',
	'h3',
	'h4',
	'ul',
	'ol',
	'li',
	'a',
	'strong',
	'em',
	'br'
]);

/** Вырезает полностью, вместе с содержимым */
const DROP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed'];

const escapeHtml = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** href разрешён только относительный путь нашего сайта (/catalog/..., /podbor...) */
function safeHref(raw: string | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value.startsWith('/') || value.startsWith('//')) return null;
	if (/\s|["'<]/.test(value)) return null;
	return value;
}

export function sanitizeSectionHtml(html: string): string {
	let out = html;
	// опасные элементы — целиком
	for (const tag of DROP_WITH_CONTENT) {
		out = out.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '');
		out = out.replace(new RegExp(`<${tag}[^>]*>`, 'gi'), '');
	}
	// разбор остальных тегов
	out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)>/g, (whole, tag: string, attrs: string) => {
		const name = tag.toLowerCase();
		if (!ALLOWED_TAGS.has(name)) return '';
		const closing = whole.startsWith('</');
		if (closing || name === 'br') return closing ? `</${name}>` : `<${name}>`;
		if (name === 'a') {
			const hrefMatch = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
			const href = safeHref(hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4]);
			return href ? `<a href="${escapeHtml(href)}">` : '<a>';
		}
		return `<${name}>`;
	});
	return out;
}

/** Похоже ли значение section_text на HTML (vs исторический плоский текст с абзацами) */
export function looksLikeHtml(text: string | null | undefined): boolean {
	return !!text && /<\/?(p|h2|h3|h4|ul|ol|li|a|strong|em|br|div|span|table|script)\b[^<>]*>/i.test(text);
}

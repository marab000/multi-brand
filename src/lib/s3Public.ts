// Публичный адрес бакета S3 (reg.ru). Нужен и на клиенте (сборка URL через
// /api/img), поэтому не зависит от серверных env. При переезде бакета — поменять здесь.
export const S3_PUBLIC_BASE = 'https://s3.regru.cloud/multibrand-product-images';

/**
 * Уменьшенная копия картинки через наш resize-прокси (/api/img).
 * Картинки из S3 отдаются в webp нужной ширины, остальное — как есть.
 */
export function imgUrl(
	url: string | null | undefined,
	width: number,
	fallback = '/images/no_image.png'
): string {
	if (!url) return fallback;
	try {
		const base = new URL(S3_PUBLIC_BASE);
		const u = new URL(url, 'https://example.com');
		if (u.protocol !== 'https:' && u.protocol !== 'http:') return url;
		if (u.host !== base.host) return url;
		const parts = u.pathname.split('/').filter(Boolean);
		// путь внутри бакета: <bucket>/<key...>
		const bucket = base.pathname.split('/').filter(Boolean)[0];
		if (parts[0] !== bucket || parts.length < 2) return url;
		const key = parts.slice(1).map(encodeURIComponent).join('/');
		return `/api/img/${key}?w=${width}`;
	} catch {
		return url;
	}
}

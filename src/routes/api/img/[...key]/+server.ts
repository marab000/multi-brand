import { error } from '@sveltejs/kit';
import { getObjectBuffer, uploadImage } from '$lib/server/s3';
import sharp from 'sharp';
import type { RequestHandler } from './$types';

// Resize-прокси картинок из S3: /api/img/<ключ>?w=<ширина>
// Первый запрос генерирует webp-вариант нужной ширины и кладёт его в бакет
// (__rs/w<ширина>/<ключ>.webp), дальше отдаётся сразу из S3.

const IMG_EXT = /\.(jpe?g|png|webp)$/i;
const KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9/._-]*$/;
const DERIVED_PREFIX = '__rs/';
const MIN_W = 40;
const MAX_W = 1920;

export const GET: RequestHandler = async ({ params, url }) => {
	const key = params.key ?? '';
	if (key.includes('..') || key.startsWith(DERIVED_PREFIX) || !KEY_RE.test(key) || !IMG_EXT.test(key)) {
		throw error(404);
	}

	const wRaw = parseInt(url.searchParams.get('w') ?? '', 10);
	const width = Number.isFinite(wRaw) ? Math.min(MAX_W, Math.max(MIN_W, wRaw)) : 1200;
	const derivedKey = `${DERIVED_PREFIX}w${width}/${key.replace(IMG_EXT, '')}.webp`;

	let buf = await getObjectBuffer(derivedKey);
	if (!buf) {
		const orig = await getObjectBuffer(key);
		if (!orig) throw error(404, 'Картинка не найдена');
		buf = await sharp(orig)
			.resize({ width, withoutEnlargement: true })
			.webp({ quality: 80 })
			.toBuffer();
		// в кэш бакета — не блокируя ответ; если упадёт, следующий запрос перегенерит
		void uploadImage(buf, derivedKey, 'image/webp').catch(() => null);
	}

	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': 'image/webp',
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
};

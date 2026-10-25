import { json, error } from '@sveltejs/kit';
import { checkAdmin } from '$lib/server/adminAuth';
import { getImagesSyncStateView, setImagesState } from '$lib/server/tetrasisImages';
import type { RequestHandler } from './$types';

// POST — запустить прогон картинок. Всегда в режиме missing: кнопкой в админке
// нельзя случайно заменить существующие картинки (это делает только MODE=full вручную).
export const POST: RequestHandler = async ({ cookies, locals }) => {
	await checkAdmin(cookies, locals);

	const view = await getImagesSyncStateView();
	if (view.running) {
		throw error(409, 'Прогон картинок уже идёт');
	}

	// счётчики обнуляем обязательно: setImagesState мержит patch поверх старого
	// стейта, иначе прогрессбар до первого флеша скрипта покажет хвост прошлого прогона
	await setImagesState({
		status: 'running',
		source: 'admin',
		startedAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		finishedAt: null,
		error: null,
		total: 0,
		done: 0,
		ok: 0,
		notFound: 0,
		noImage: 0,
		errors: 0,
		current: null
	});

	try {
		const { spawn } = await import('node:child_process');
		const child = spawn(process.execPath, ['scripts/fetch-tetrasis-images/fetch.js'], {
			cwd: process.cwd(),
			detached: true,
			stdio: 'ignore',
			env: { ...process.env, FETCH_IMAGES_RUN_SOURCE: 'admin', FETCH_IMAGES_MODE: 'missing' }
		});
		child.on('error', (e) => {
			setImagesState({ status: 'failed', finishedAt: new Date().toISOString(), error: `spawn: ${e.message}` }).catch(() => null);
		});
		child.unref();
	} catch (e: any) {
		await setImagesState({
			status: 'failed',
			finishedAt: new Date().toISOString(),
			error: `spawn: ${e?.message || e}`
		});
		throw error(500, 'Не удалось запустить прогон картинок');
	}

	return json({ ok: true });
};

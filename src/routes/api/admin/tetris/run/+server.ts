import { json, error } from '@sveltejs/kit';
import { checkAdmin } from '$lib/server/adminAuth';
import {
	getSyncStateView,
	setSyncState,
	cooldownError,
	hasApiKey
} from '$lib/server/tetrasis';
import type { RequestHandler } from './$types';

const SPAWN_TIMEOUT_MS = 10000;

// POST — запустить синк Тетриса (не чаще раза в 15 минут)
export const POST: RequestHandler = async ({ cookies, locals }) => {
	await checkAdmin(cookies, locals);

	if (!hasApiKey()) {
		throw error(500, 'TETRAIS_API_KEY не найден в .env — синк запустить нельзя');
	}

	const view = await getSyncStateView();
	if (view.running) {
		throw error(409, 'Синхронизация уже идёт');
	}
	if (view.cooldownMs > 0) {
		throw error(429, cooldownError(view.cooldownMs));
	}

	const startedAt = new Date().toISOString();
	await setSyncState({
		status: 'running',
		startedAt,
		finishedAt: null,
		source: 'admin',
		error: null
	});

	try {
		const { spawn } = await import('node:child_process');
		const child = spawn(
			process.execPath,
			['scripts/sync-tetrasis-products/sync.js'],
			{
				cwd: process.cwd(),
				detached: true,
				stdio: 'ignore',
				env: { ...process.env, SYNC_SOURCE: 'admin' }
			}
		);
		child.on('error', (e) => {
			setSyncState({ status: 'failed', finishedAt: new Date().toISOString(), error: `spawn: ${e.message}` }).catch(() => null);
		});
		child.unref();
	} catch (e: any) {
		await setSyncState({
			status: 'failed',
			finishedAt: new Date().toISOString(),
			error: `spawn: ${e?.message || e}`
		});
		throw error(500, 'Не удалось запустить процесс синка');
	}

	return json({ ok: true, startedAt, timeoutMs: SPAWN_TIMEOUT_MS });
};

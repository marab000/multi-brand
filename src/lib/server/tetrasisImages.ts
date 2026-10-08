import { sql } from '$lib/db';

// Синк картинок Тетриса: состояние прогона пишет сам скрипт
// scripts/fetch-tetrasis-images/fetch.js в settings.tetrasis_images_state
// (старт, heartbeat раз в ~2 минуты, финал done/failed). Админка только читает.
// Тот же ключ и тот же порог свежести скрипт использует как лок от второго
// запуска (cron + кнопка в админке одновременно).

export const IMAGES_STATE_KEY = 'tetrasis_images_state';
// heartbeat скрипта: если running висит без обновлений дольше — запуск считаем мёртвым
export const STALE_RUNNING_MS = 15 * 60 * 1000;

export type ImagesSyncState = {
	status: 'idle' | 'running' | 'done' | 'failed';
	mode?: string | null;
	source?: 'admin' | 'cli' | null;
	startedAt?: string | null;
	updatedAt?: string | null;
	finishedAt?: string | null;
	error?: string | null;
	total?: number | null;
	done?: number | null;
	ok?: number | null;
	notFound?: number | null;
	noImage?: number | null;
	errors?: number | null;
	current?: string | null;
};

const DEFAULT_STATE: ImagesSyncState = { status: 'idle' };

async function getState(): Promise<ImagesSyncState> {
	const rows = await sql`select value from settings where key = ${IMAGES_STATE_KEY} limit 1`;
	if (!rows.length) return { ...DEFAULT_STATE };
	try {
		return { ...DEFAULT_STATE, ...(typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value) };
	} catch {
		return { ...DEFAULT_STATE };
	}
}

export async function setImagesState(patch: Partial<ImagesSyncState>): Promise<ImagesSyncState> {
	const next = { ...(await getState()), ...patch };
	const json = JSON.stringify(next);
	await sql`
		insert into settings (key, value, updated_at)
		values (${IMAGES_STATE_KEY}, ${json}, now())
		on conflict (key) do update set value = ${json}, updated_at = now()
	`;
	return next;
}

export async function getImagesSyncStateView() {
	const state = await getState();
	const beat = state.updatedAt ? Date.parse(state.updatedAt) : 0;
	const stale = state.status === 'running' && Date.now() - beat > STALE_RUNNING_MS;
	return { state, running: state.status === 'running' && !stale, stale };
}

import { sql } from '$lib/db';
import { TETRAIS_API_KEY } from '$env/static/private';

// Управление синком Тетриса из админки: список брендов (settings.tetrasis_brands)
// и состояние последнего запуска (settings.tetrasis_sync_state).
// Сам скрипт синка — scripts/sync-tetrasis-products/sync.js, он читает те же настройки.

const API_BASE = 'https://tetrasis-bt.ru';
export const SYNC_COOLDOWN_MS = 15 * 60 * 1000;
// если статус running висит дольше — считаем запуск зависшим и разрешаем новый
const STALE_RUNNING_MS = 3 * 60 * 60 * 1000;

export const BRANDS_KEY = 'tetrasis_brands';
export const STATE_KEY = 'tetrasis_sync_state';

export type BrandConfig = { all: string[]; enabled: string[] };
export type SyncState = {
	status: 'idle' | 'running' | 'done' | 'failed';
	startedAt: string | null;
	finishedAt: string | null;
	source: 'admin' | 'cli' | null;
	error: string | null;
	unmatched: string[];
};

const DEFAULT_STATE: SyncState = {
	status: 'idle',
	startedAt: null,
	finishedAt: null,
	source: null,
	error: null,
	unmatched: []
};

export function cleanBrandName(s: string): string {
	return String(s || '')
		.replace(/['"]/g, '')
		.trim();
}

// слияние списков брендов без дублей по нижнему регистру (наши канонические имена приоритетнее)
function mergeBrandLists(primary: string[], secondary: string[]): string[] {
	const byKey = new Map<string, string>();
	for (const b of [...primary, ...secondary]) {
		const clean = cleanBrandName(b);
		if (!clean) continue;
		const key = clean.toLowerCase();
		if (!byKey.has(key)) byKey.set(key, clean);
	}
	return [...byKey.values()];
}

async function getSetting(key: string): Promise<any | null> {
	const rows = await sql`select value from settings where key = ${key} limit 1`;
	if (!rows.length) return null;
	try {
		return JSON.parse(rows[0].value);
	} catch {
		return null;
	}
}

async function putSetting(key: string, value: any): Promise<void> {
	const json = JSON.stringify(value);
	await sql`
		insert into settings (key, value, updated_at)
		values (${key}, ${json}, now())
		on conflict (key) do update set value = ${json}, updated_at = now()
	`;
}

export function hasApiKey(): boolean {
	return Boolean(TETRAIS_API_KEY);
}

async function fetchApiBrands(): Promise<string[] | null> {
	if (!TETRAIS_API_KEY) return null;
	try {
		const res = await fetch(`${API_BASE}/exch_api.php?CODE=${TETRAIS_API_KEY}`, {
			signal: AbortSignal.timeout(20000)
		});
		if (!res.ok) return null;
		const list = await res.json();
		if (!Array.isArray(list)) return null;
		return list.map((b: any) => String(b?.NAME || '')).filter(Boolean);
	} catch {
		return null;
	}
}

// brands.json — дефолтный список (канонические имена)
async function defaultBrands(): Promise<string[]> {
	const fs = await import('node:fs/promises');
	const path = await import('node:path');
	try {
		const file = path.resolve('scripts/sync-tetrasis-products/brands.json');
		const raw = JSON.parse(await fs.readFile(file, 'utf8'));
		if (Array.isArray(raw)) return raw.map(cleanBrandName).filter(Boolean);
	} catch {
		// файла нет (например, на проде после переезда) — не беда
	}
	return [];
}

/** Читает конфиг брендов; при первом обращении досевает список из АПИ Тетриса. */
export async function getBrandConfig(): Promise<BrandConfig> {
	const stored = await getSetting(BRANDS_KEY);
	const fallback = await defaultBrands();
	const allBase = mergeBrandLists(Array.isArray(stored?.all) ? stored.all : [], fallback);
	const enabled = Array.isArray(stored?.enabled)
		? stored.enabled.map(cleanBrandName).filter(Boolean)
		: fallback;

	let all = allBase;
	// первый запуск: тянем полный список брендов из АПИ
	if (!stored) {
		const apiBrands = await fetchApiBrands();
		if (apiBrands) all = mergeBrandLists(all, apiBrands);
	}
	if (!Array.isArray(stored)) await putSetting(BRANDS_KEY, { all, enabled });
	return { all, enabled };
}

export async function saveEnabledBrands(enabled: string[]): Promise<BrandConfig> {
	const cfg = await getBrandConfig();
	const clean = mergeBrandLists(enabled, []);
	await putSetting(BRANDS_KEY, { all: cfg.all, enabled: clean });
	return { all: cfg.all, enabled: clean };
}

export async function getSyncState(): Promise<SyncState> {
	const stored = await getSetting(STATE_KEY);
	return { ...DEFAULT_STATE, ...(stored && typeof stored === 'object' ? stored : {}) };
}

export async function setSyncState(patch: Partial<SyncState>): Promise<SyncState> {
	const next = { ...(await getSyncState()), ...patch };
	await putSetting(STATE_KEY, next);
	return next;
}

export async function getSyncStateView() {
	const state = await getSyncState();
	const now = Date.now();
	const started = state.startedAt ? Date.parse(state.startedAt) : 0;
	const running = state.status === 'running' && now - started < STALE_RUNNING_MS;
	const cooldownMs = running ? 0 : Math.max(0, SYNC_COOLDOWN_MS - (now - started));
	return { state, running, cooldownMs, canRun: !running && cooldownMs === 0 };
}

export function cooldownError(cooldownMs: number): string {
	const min = Math.ceil(cooldownMs / 60000);
	return `Синхронизацию можно запускать не чаще, чем раз в 15 минут. Подождите ещё ${min} мин.`;
}

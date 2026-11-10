import { sql } from '$lib/db';

// Статус автопроверки писем (scripts/health-check.mjs пишет в settings.health_check).
// Красная кнопка профиля в шапке для админа смотрит сюда.

const HEALTH_KEY = 'health_check';
// Cron ходит раз в 3 часа; проверка молчит дольше 7 часов = два пропущенных
// интервала — считаем надзор сломанным (крон умер / VPS лежит).
export const HEALTH_STALE_MS = 7 * 60 * 60 * 1000;

export type HealthStatus = {
  // проверка вообще была? (крон не установлен — grey, не красный)
  checked: boolean;
  // красная кнопка: проверка была, свежая и всё зелёное
  ok: boolean;
  stale: boolean;
  checkedAt: string | null;
  keyAlive: boolean | null;
  domainStatus: string | null;
  error: string | null;
};

export async function getHealthStatus(): Promise<HealthStatus> {
  try {
    const rows = await sql`select value from settings where key = ${HEALTH_KEY} limit 1`;
    if (!rows.length) {
      return {
        checked: false,
        ok: true,
        stale: false,
        checkedAt: null,
        keyAlive: null,
        domainStatus: null,
        error: null
      };
    }
    const raw = JSON.parse(rows[0].value);
    const checkedAt: string = raw?.checkedAt ?? null;
    const age = checkedAt ? Date.now() - new Date(checkedAt).getTime() : Infinity;
    const stale = age > HEALTH_STALE_MS;
    const ok = !stale && raw?.ok === true;
    return {
      checked: true,
      ok,
      stale,
      checkedAt,
      keyAlive: raw?.keyAlive ?? null,
      domainStatus: raw?.domainStatus ?? null,
      error: raw?.error ?? null
    };
  } catch {
    // база/строка недоступны — не красим кнопку (поломку базы этот механизм не ловит)
    return {
      checked: false,
      ok: true,
      stale: false,
      checkedAt: null,
      keyAlive: null,
      domainStatus: null,
      error: null
    };
  }
}

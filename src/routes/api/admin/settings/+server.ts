import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { checkAdmin } from '$lib/server/adminAuth';
import type { RequestHandler } from './$types';

// GET — все настройки
export const GET: RequestHandler = async ({ cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const rows = await sql`SELECT key, value FROM settings`;
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return json(settings);
};

// PATCH — обновление настройки
export const PATCH: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    if (key === 'cart_discount_percent') {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 90) {
        throw error(400, 'Скидка должна быть от 0 до 90');
      }
      await sql`
        insert into settings (key, value, updated_at)
        values (${key}, ${String(num)}, now())
        on conflict (key) do update set value = ${String(num)}, updated_at = now()
      `;
    }
    if (key === 'excluded_brands') {
      // value = массив строк брендов
      const brands = Array.isArray(value) ? value : [];
      await sql`
        insert into settings (key, value, updated_at)
        values (${key}, ${JSON.stringify(brands)}, now())
        on conflict (key) do update set value = ${JSON.stringify(brands)}, updated_at = now()
      `;
    }
    if (key === 'bundle_discount_enabled') {
      const enabled = value === true || value === 'true' ? 'true' : 'false';
      await sql`
        insert into settings (key, value, updated_at)
        values ('bundle_discount_enabled', ${enabled}, now())
        on conflict (key) do update set value = ${enabled}, updated_at = now()
      `;
    }
    if (key === 'bundle_discount_percent') {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 30) {
        throw error(400, 'Скидка за комплект должна быть от 0 до 30');
      }
      await sql`
        insert into settings (key, value, updated_at)
        values ('bundle_discount_percent', ${String(num)}, now())
        on conflict (key) do update set value = ${String(num)}, updated_at = now()
      `;
    }
    if (key === 'podbor_config') {
      const cfg = value && typeof value === 'object' ? value : null;
      if (!cfg) throw error(400, 'Некорректный конфиг викторины');
      const mode = cfg.brands?.mode;
      if (mode !== undefined && !['all', 'whitelist', 'blacklist'].includes(mode)) {
        throw error(400, 'Режим брендов: all / whitelist / blacklist');
      }
      const isStrArr = (v: any) => Array.isArray(v) && v.every((x) => typeof x === 'string');
      if (
        (cfg.brands?.whitelist !== undefined && !isStrArr(cfg.brands.whitelist)) ||
        (cfg.brands?.blacklist !== undefined && !isStrArr(cfg.brands.blacklist))
      ) {
        throw error(400, 'Списки брендов должны быть массивами строк');
      }
      if (
        cfg.priorityProducts !== undefined &&
        (!Array.isArray(cfg.priorityProducts) ||
          cfg.priorityProducts.length > 100 ||
          !cfg.priorityProducts.every((x: any) => typeof x === 'string' || Number.isInteger(x)))
      ) {
        throw error(400, 'Приоритетные товары — массив id (до 100)');
      }
      if (cfg.texts !== undefined && typeof cfg.texts !== 'object') {
        throw error(400, 'texts должен быть объектом');
      }
      const normalized = {
        version: 1,
        brands: {
          mode: cfg.brands?.mode ?? 'all',
          whitelist: cfg.brands?.whitelist ?? [],
          blacklist: cfg.brands?.blacklist ?? []
        },
        priorityProducts: cfg.priorityProducts ?? [],
        texts: cfg.texts ?? {}
      };
      const json = JSON.stringify(normalized);
      await sql`
        insert into settings (key, value, updated_at)
        values ('podbor_config', ${json}, now())
        on conflict (key) do update set value = ${json}, updated_at = now()
      `;
    }
  }

  return json({ ok: true });
};

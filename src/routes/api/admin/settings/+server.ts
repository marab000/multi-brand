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
  }

  return json({ ok: true });
};

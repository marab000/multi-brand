import { error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { hasRole } from '$lib/server/auth';

const COOKIE = 'admin_session';

/**
 * Проверяет admin_session cookie. Бросает 401 если не админ.
 * SSO: сайт-юзер с ролью 'admin' (users.roles) тоже проходит без отдельного логина.
 */
export async function checkAdmin(cookies: any, locals?: any) {
  const session = cookies.get(COOKIE);
  if (session) {
    const users = await sql`SELECT id FROM admin_users WHERE id=${Number(session)}`;
    if (users.length) return;
  }
  if (hasRole(locals?.user, 'admin')) return;
  throw error(401, 'Unauthorized');
}

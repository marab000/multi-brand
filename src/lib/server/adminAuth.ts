import { error } from '@sveltejs/kit';
import { hasRole } from '$lib/server/auth';

/**
 * Единая авторизация админки: сайт-юзер с ролями в users.roles,
 * сессия — стандартная (user_sessions + cookie 'session' из hooks).
 * Отдельной таблицы admin_users больше нет.
 */
export async function checkAdmin(_cookies: any, locals?: any) {
  if (hasRole(locals?.user, 'admin')) return;
  throw error(401, 'Unauthorized');
}

/** Доступ к SEO-разделу: полноценный админ ИЛИ пользователь с ролью 'seo'.
 *  Роль 'seo' не даёт доступа к остальным разделам админки. */
export async function checkSeoAccess(_cookies: any, locals?: any) {
  if (hasRole(locals?.user, 'admin') || hasRole(locals?.user, 'seo')) return;
  throw error(401, 'Unauthorized');
}

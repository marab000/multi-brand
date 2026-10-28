import { fail, redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import {
  SESSION_COOKIE,
  createSession,
  hasRole,
  normalizeEmail,
  setSessionCookie,
  verifyPassword
} from '$lib/server/auth';

// Единый вход в админку: сайт-аккаунт из users (email или телефон) с ролью
// admin/seo. Сессия — стандартная, как на сайте (user_sessions + cookie 'session').

export const load = async ({ locals }) => {
  if (hasRole(locals.user, 'admin') || hasRole(locals.user, 'seo')) {
    throw redirect(302, '/admin/orders');
  }
};

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const login = String(data.get('login')).trim();
    const password = String(data.get('password'));
    const failMsg = 'Неверный логин или пароль';

    const rows = await sql`
      select id, email, password_hash, roles
      from users
      where email = ${normalizeEmail(login)} or phone = ${login}
      limit 1
    `;
    const user = rows[0];
    if (!user) return fail(400, { error: failMsg });
    if (!(await verifyPassword(password, user.password_hash))) return fail(400, { error: failMsg });
    if (!hasRole(user, 'admin') && !hasRole(user, 'seo')) return fail(400, { error: failMsg });

    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(cookies, token, expiresAt);
    throw redirect(302, '/admin/orders');
  }
};

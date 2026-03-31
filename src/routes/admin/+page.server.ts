import { fail, redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import bcrypt from 'bcryptjs';

const COOKIE = 'admin_session';

export const load = async ({ cookies }) => {
  const session = cookies.get(COOKIE);
  if (session) throw redirect(302, '/admin/orders');
};

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const login = String(data.get('login'));
    const password = String(data.get('password'));

    const users = await sql`SELECT * FROM admin_users WHERE login=${login}`;
    if (!users.length) return fail(400, { error: 'Неверный логин или пароль' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return fail(400, { error: 'Неверный логин или пароль' });

    cookies.set(COOKIE, String(user.id), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax'
    });

    throw redirect(302, '/admin/orders');
  }
};

import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { createSession, normalizeEmail, setSessionCookie, verifyPassword } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  const login = String(body?.login ?? '').trim();
  const password = String(body?.password ?? '');
  if (!login || !password) return json({ message: 'Введи email и пароль' }, { status: 400 });
  const rows = await sql`
    select id, email, phone, full_name, email_verified, password_hash
    from users
    where email = ${normalizeEmail(login)} or phone = ${login}
    limit 1
  `;
  const user = rows[0];
  if (!user) return json({ message: 'Неверный email или пароль' }, { status: 401 });
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return json({ message: 'Неверный email или пароль' }, { status: 401 });
  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(cookies, token, expiresAt);
  return json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      full_name: user.full_name,
      email_verified: user.email_verified
    }
  });
};

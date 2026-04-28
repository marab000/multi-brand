import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import {
  createSession,
  hashPassword,
  normalizeEmail,
  normalizePhone,
  setSessionCookie
} from '$lib/server/auth';
import { createEmailVerificationToken } from '$lib/server/emailVerification';
import { sendVerificationEmail } from '$lib/server/email';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  const fullName = String(body?.fullName ?? '').trim();
  const email = normalizeEmail(String(body?.email ?? ''));
  const phone = normalizePhone(String(body?.phone ?? ''));
  const password = String(body?.password ?? '');
  if (!fullName || !email || !phone || !password)
    return json({ message: 'Заполни все поля' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json({ message: 'Некорректный email' }, { status: 400 });
  if (password.length < 6)
    return json({ message: 'Пароль должен быть минимум 6 символов' }, { status: 400 });

  const exists = await sql`select id from users where email = ${email} limit 1`;
  if (exists[0]) return json({ message: 'Пользователь с таким email уже есть' }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const rows = await sql`
    insert into users (email, phone, full_name, password_hash, email_verified)
    values (${email}, ${phone}, ${fullName}, ${passwordHash}, false)
    returning id, email, phone, full_name, email_verified
  `;
  const user = rows[0];

  try {
    const { token: emailToken } = await createEmailVerificationToken(user.id);
    const baseUrl = new URL(request.url).origin;
    const verifyUrl = `${baseUrl}/verify-email?token=${emailToken}`;
    await sendVerificationEmail(user.email, verifyUrl);
  } catch (e) {
    console.error('EMAIL SEND ERROR:', e);
  }

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(cookies, token, expiresAt);
  return json({ user });
};

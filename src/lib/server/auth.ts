import { sql } from '$lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

export type AuthUser = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  email_verified: boolean;
  roles: string[];
};

// Есть ли у юзера роль (roles — массив: {'designer','sales', ...})
export function hasRole(user: { roles?: string[] | null } | null, role: string) {
  return !!user?.roles?.includes(role);
}

export type AuthSession = {
  id: string;
  expires_at: string;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string) {
  return phone.trim().replace(/[^\d+]/g, '');
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt
  });
}

export function deleteSessionCookie(cookies: Cookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function createSession(userId: number) {
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const rows = await sql`
    insert into user_sessions (user_id, token_hash, expires_at)
    values (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
    returning id, expires_at
  `;
  return { token, session: rows[0] as AuthSession, expiresAt };
}

export async function validateSessionToken(token: string) {
  const tokenHash = hashToken(token);
  const rows = await sql`
    select s.id as session_id, s.expires_at, u.id, u.email, u.phone, u.full_name, u.email_verified, u.roles
    from user_sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${tokenHash}
    limit 1
  `;
  const row = rows[0];
  if (!row) return { user: null, session: null };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await sql`delete from user_sessions where id = ${row.session_id}`;
    return { user: null, session: null };
  }
  return {
    user: {
      id: row.id,
      email: row.email,
      phone: row.phone,
      full_name: row.full_name,
      email_verified: row.email_verified,
      roles: row.roles ?? []
    } as AuthUser,
    session: {
      id: row.session_id,
      expires_at: row.expires_at
    } as AuthSession
  };
}

export async function deleteSessionByToken(token: string) {
  await sql`delete from user_sessions where token_hash = ${hashToken(token)}`;
}

// ─── Восстановление пароля ───

const RESET_TTL_MIN = 60;

/** Создаёт запрос сброса: одноразовый токен (в письме), в БД — sha256-хэш с TTL.
 *  Возвращает токен или null, если юзера с такой почтой нет (наружу не отличаем). */
export async function createPasswordReset(email: string) {
	const normalized = email.trim().toLowerCase();
	const rows =
		await sql`select id from users where lower(email) = ${normalized} limit 1`;
	if (!rows.length) return null;
	const userId = rows[0].id as number;
	const token = crypto.randomBytes(32).toString('base64url');
	// старые запросы юзера гасим — живёт только последний
	await sql`delete from password_resets where user_id = ${userId}`;
	await sql`
		insert into password_resets (user_id, token_hash, expires_at)
		values (${userId}, ${hashToken(token)}, now() + make_interval(mins => ${RESET_TTL_MIN}))`;
	return token;
}

/** Проверяет токен сброса (существует и не протух). Возвращает user_id или null. */
export async function verifyPasswordReset(token: string): Promise<number | null> {
	const rows = await sql`
		select user_id from password_resets
		where token_hash = ${hashToken(token)} and expires_at > now()
		limit 1`;
	return rows.length ? (rows[0].user_id as number) : null;
}

/** Применяет сброс: новый пароль + гасит токен и все сессии юзера. */
export async function consumePasswordReset(token: string, newPassword: string) {
	const userId = await verifyPasswordReset(token);
	if (!userId) return false;
	const password_hash = await hashPassword(newPassword);
	await sql`update users set password_hash = ${password_hash} where id = ${userId}`;
	await sql`delete from password_resets where user_id = ${userId}`;
	await sql`delete from user_sessions where user_id = ${userId}`;
	return true;
}

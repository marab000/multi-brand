import { json } from '@sveltejs/kit';
import { deleteSessionByToken, deleteSessionCookie, SESSION_COOKIE } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE);
  if (token) await deleteSessionByToken(token);
  deleteSessionCookie(cookies);
  // Разлогиниваем и админку, если она была открыта в этом браузере
  cookies.delete('admin_session', { path: '/' });
  return json({ ok: true });
};
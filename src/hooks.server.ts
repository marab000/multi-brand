import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSessionCookie, validateSessionToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(SESSION_COOKIE);
  if (!token) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }
  const { user, session } = await validateSessionToken(token);
  if (!user || !session) deleteSessionCookie(event.cookies);
  event.locals.user = user;
  event.locals.session = session;
  return resolve(event);
};
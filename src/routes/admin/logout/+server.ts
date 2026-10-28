import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSessionCookie } from '$lib/server/auth';

export const GET = async ({ cookies }) => {
  deleteSessionCookie(cookies);
  throw redirect(302, '/admin');
};

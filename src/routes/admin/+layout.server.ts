import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';

const COOKIE = 'admin_session';

export const load = async ({ cookies, url }) => {
  const session = cookies.get(COOKIE);
  const isLogin = url.pathname === '/admin';

  if (!session && !isLogin) {
    throw redirect(302, '/admin');
  }

  if (session) {
    const users = await sql`
      SELECT id, role FROM admin_users WHERE id=${Number(session)}
    `;

    if (!users.length) {
      throw redirect(302, '/admin');
    }

    if (isLogin) {
      throw redirect(302, '/admin/orders');
    }

    return {
      user: users[0]
    };
  }

  return {
    user: null
  };
};

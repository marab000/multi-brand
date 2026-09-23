import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { hasRole } from '$lib/server/auth';

const COOKIE = 'admin_session';

export const load = async ({ cookies, url, locals }) => {
  const session = cookies.get(COOKIE);
  const isLogin = url.pathname === '/admin';
  // SSO: сайт-юзер с ролью 'admin' входит в панель без отдельного логина
  const siteAdmin = hasRole(locals.user, 'admin');

  if (!session && !siteAdmin && !isLogin) {
    throw redirect(302, '/admin');
  }

  if (session) {
    const users = await sql`
      SELECT id, role FROM admin_users WHERE id=${Number(session)}
    `;

    if (!users.length) {
      // протухшая сессия (юзер удалён) — сбрасываем куку, иначе редирект-луп
      cookies.delete(COOKIE, { path: '/' });
      if (!siteAdmin) throw redirect(302, '/admin');
    } else {
      if (isLogin) {
        throw redirect(302, '/admin/orders');
      }

      return {
        user: users[0]
      };
    }
  }

  if (siteAdmin) {
    if (isLogin) {
      throw redirect(302, '/admin/orders');
    }
    return {
      user: { id: 0, role: 'admin' }
    };
  }

  return {
    user: null
  };
};

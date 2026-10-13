import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { hasRole } from '$lib/server/auth';

const COOKIE = 'admin_session';
// Имя для «Вы вошли как»: имя сайт-аккаунта (как в профиле), иначе логин админки
const displayName = (login: string, siteUser: { full_name: string; email: string } | null) =>
  siteUser?.full_name || siteUser?.email || login;

export const load = async ({ cookies, url, locals }) => {
  const session = cookies.get(COOKIE);
  const isLogin = url.pathname === '/admin';
  // SSO: сайт-юзер с ролью 'admin' входит в панель без отдельного логина
  const siteAdmin = hasRole(locals.user, 'admin');
  // Роль 'seo': только раздел /admin/seo (+ выход), остальная админка закрыта
  const isSeo = hasRole(locals.user, 'seo');
  const seoAllowed = url.pathname === '/admin/seo' || url.pathname.startsWith('/admin/seo/') || url.pathname === '/admin/logout';
  if (isSeo && !siteAdmin && locals.user) {
    if (!seoAllowed) throw redirect(302, '/admin/seo');
    return {
      user: {
        id: locals.user.id,
        role: 'seo',
        roles: locals.user.roles,
        name: locals.user.full_name || locals.user.email
      }
    };
  }

  if (!session && !siteAdmin && !isLogin) {
    throw redirect(302, '/admin');
  }

  if (session) {
    const users = await sql`
      SELECT id, role, login FROM admin_users WHERE id=${Number(session)}
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
        user: { ...users[0], name: displayName(users[0].login, locals.user) }
      };
    }
  }

  if (siteAdmin) {
    if (isLogin) {
      throw redirect(302, '/admin/orders');
    }
    return {
      user: { id: 0, role: 'admin', name: displayName('admin', locals.user) }
    };
  }

  return {
    user: null
  };
};

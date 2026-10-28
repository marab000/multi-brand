import { redirect } from '@sveltejs/kit';
import { hasRole } from '$lib/server/auth';

// Единый вход: авторизация по locals.user (сессия из hooks), роли admin/seo.
// Отдельной админской сессии (admin_session / admin_users) больше нет.
export const load = async ({ url, locals }) => {
  const isLogin = url.pathname === '/admin';
  const user = locals.user;
  const siteAdmin = hasRole(user, 'admin');
  // Роль 'seo': только раздел /admin/seo (+ выход), остальная админка закрыта
  const isSeo = hasRole(user, 'seo');

  if (isLogin) {
    if (siteAdmin || isSeo) throw redirect(302, '/admin/orders');
    return { user: null };
  }

  if (isSeo && !siteAdmin && user) {
    const seoAllowed =
      url.pathname === '/admin/seo' || url.pathname.startsWith('/admin/seo/') || url.pathname === '/admin/logout';
    if (!seoAllowed) throw redirect(302, '/admin/seo');
    return {
      user: {
        id: user.id,
        role: 'seo',
        roles: user.roles,
        name: user.full_name || user.email
      }
    };
  }

  if (!siteAdmin || !user) throw redirect(302, '/admin');

  return {
    user: {
      id: user.id,
      role: 'admin',
      roles: user.roles,
      name: user.full_name || user.email
    }
  };
};

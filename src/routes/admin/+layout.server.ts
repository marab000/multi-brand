import { redirect } from '@sveltejs/kit';
import { hasRole } from '$lib/server/auth';
import { getHealthStatus } from '$lib/server/healthCheck';

// Единый вход: авторизация по locals.user (сессия из hooks), роли admin/seo/operator.
// Отдельной админской сессии (admin_session / admin_users) больше нет.
export const load = async ({ url, locals }) => {
  const isLogin = url.pathname === '/admin';
  const user = locals.user;
  const siteAdmin = hasRole(user, 'admin');
  // Роль 'seo': только раздел /admin/seo (+ выход), остальная админка закрыта
  const isSeo = hasRole(user, 'seo');
  // Роль operator: только чат (/admin/chats) и выход
  const isOperator = hasRole(user, 'operator');

  if (isLogin) {
    if (siteAdmin || isSeo || isOperator) {
      throw redirect(302, isOperator && !siteAdmin ? '/admin/chats' : '/admin/orders');
    }
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

  if (isOperator && !siteAdmin && user) {
    const operatorAllowed =
      url.pathname.startsWith('/admin/chats') ||
      url.pathname.startsWith('/admin/chat-settings') ||
      url.pathname === '/admin/logout';
    if (!operatorAllowed) throw redirect(302, '/admin/chats');
    return {
      user: {
        id: user.id,
        role: 'operator',
        roles: user.roles,
        name: user.full_name || user.email
      }
    };
  }

  if (!siteAdmin || !user) throw redirect(302, '/admin');

  // поломка автопроверки писем → красный пункт «Здоровье системы» в сайдбаре
  const health = await getHealthStatus();

  return {
    user: {
      id: user.id,
      role: 'admin',
      roles: user.roles,
      name: user.full_name || user.email
    },
    healthBad: health.checked && !health.ok
  };
};

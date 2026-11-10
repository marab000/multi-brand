import { json } from '@sveltejs/kit';
import { getHealthStatus } from '$lib/server/healthCheck';
import type { RequestHandler } from './$types';

// Статус автопроверки писем — для красной кнопки профиля в шапке.
// Только админ: оператору и SEO-редактору это не нужно.
export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user?.roles?.includes('admin')) {
    return json({ message: 'Недоступно' }, { status: 403 });
  }
  return json(await getHealthStatus());
};

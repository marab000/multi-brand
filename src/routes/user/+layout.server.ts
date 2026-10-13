import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // гость тапает «Профиль» в мобильном меню — кидаем на главную и открываем вход
  if (!locals.user) throw redirect(303, '/?auth=login');
  return { user: locals.user };
};
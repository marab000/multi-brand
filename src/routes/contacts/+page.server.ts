import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Страницы «Контакты» больше нет — контент живёт в «О компании»
export const load: PageServerLoad = async () => {
  redirect(301, '/about');
};

import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

// Страж изоляции двух сайтов: в основном билде (SITE не задан) маршрута /asko
// не существует — 404, чтобы на multi-brand.online не было доступа к витрине.
// В asko-сборке (SITE=asko) и в dev маршрут живёт.
export const load: LayoutServerLoad = async () => {
	if (!dev && env.SITE !== 'asko') {
		error(404, 'Not Found');
	}
};

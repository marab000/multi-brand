// Страница-витрина пререндерится только в asko-сборке (adapter-static).
// В основной сборке prerender=false — иначе /asko стала бы обязательной целью
// пререндера и упала бы на страже изоляции (404 из +layout.server.ts).
export const prerender = process.env.SITE === 'asko';

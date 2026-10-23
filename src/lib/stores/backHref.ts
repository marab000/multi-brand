import { writable } from 'svelte/store';

/**
 * Куда ведёт стрелка «назад» в шапке на мобилке.
 * Страницы сами сообщают родителя (страница товара — её категория),
 * null — стрелка не показывается, вместо неё кнопка «Каталог».
 */
export const backHref = writable<string | null>(null);

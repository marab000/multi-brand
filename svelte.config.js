import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';

// Второй сайт (ASKO-витрина) собирается из этого же проекта отдельной командой:
// SITE=asko vite build → adapter-static в build-asko (статика для nginx на своём домене).
// Без SITE — обычный adapter-node для основного магазина. /asko в основном билде отдаёт 404
// (страж в src/routes/asko/+layout.server.ts), изоляция сайтов сохраняется.
const isAsko = process.env.SITE === 'asko';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Приглушённые рекомендации компилятора: легаси-паттерны старых страниц
		// (state_referenced_locally, non_reactive_update) и мёртвые стили.
		// Чинить будем точечно при рефакторинге, в выводе деплоя они не нужны.
		warningFilter: (warning) =>
			![
			'state_referenced_locally',
			'non_reactive_update',
			'css_unused_selector',
			'block_empty',
			'a11y_click_events_have_key_events',
			'a11y_no_static_element_interactions',
			'a11y_media_has_caption',
			'slot_element_deprecated',
			'export_let_unused'
		].includes(warning.code)
	},
	preprocess: preprocess({
		scss: {
			// тема токенов: asko-сборка получает палитру витрины, основной — фирменную
			prependData: `@use 'src/lib/styles/variables${isAsko ? '.asko' : ''}.scss' as *;`
		},
		postcss: true
	}),
	kit: {
		adapter: isAsko
			? adapterStatic({ pages: 'build-asko', assets: 'build-asko', strict: false })
			: adapter({
					out: 'build',
				}),
		// пререндерим только аско-маршруты: entries ['/'] в asko-сборке рендерил бы
		// главную основного сайта (с походами в БД) — не нужно
		prerender: isAsko ? { entries: ['/asko'] } : undefined
	}
};

export default config;
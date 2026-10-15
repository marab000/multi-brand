import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-node';

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
			prependData: `@use 'src/lib/styles/variables.scss' as *;`
		},
		postcss: true
	}),
	kit: {
		adapter: adapter({
			out: 'build',
		}),
	}
};

export default config;
import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
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
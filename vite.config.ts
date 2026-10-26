import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // городские поддомены тестируются в dev подстановкой Host-заголовка:
  // curl -H "Host: msk.multi-brand.online" http://localhost:5199/catalog/...
  server: { allowedHosts: ['msk.multi-brand.online', 'ufa.multi-brand.online'] }
});

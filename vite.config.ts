import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // городские поддомены тестируются в dev подстановкой Host-заголовка:
  // curl -H "Host: msk.multi-brand.online" http://localhost:5199/catalog/...
  server: {
    // единый dev-порт для всех чатов; strictPort — падаем громко, если занят,
    // а не молча расползаемся по 5173/5174/5175
    port: 5199,
    strictPort: true,
    allowedHosts: ['msk.multi-brand.online', 'ufa.multi-brand.online']
  }
});

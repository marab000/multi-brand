// Конфиг pm2 — переменные окружения живут тут и переживают рестарты/перезагрузку сервера
// Использование: pm2 start ecosystem.config.cjs  (при первом запуске)
//                 pm2 restart ecosystem.config.cjs --update-env  (при изменениях)
module.exports = {
  apps: [
    {
      name: 'multibrand',
      script: 'build/index.js',
      env: {
        NODE_ENV: 'production',
        // Лимит тела запроса для загрузки слайдов (дефолт SvelteKit 512K)
        BODY_SIZE_LIMIT: '15M'
      }
    }
  ]
};

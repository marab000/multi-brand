# ASKO-витрина — второй сайт из этого же репозитория

Витрина ASKO собирается из этого же проекта отдельной статической сборкой и живёт
на своём домене. Основной магазин (adapter-node, pm2 `multibrand`) не меняется.

## Как это устроено

- `SITE=asko vite build` → `adapter-static` → папка `build-asko/` (статика для nginx).
- Без `SITE` — обычная сборка основного сайта в `build/` (как раньше).
- Маршрут витрины: `src/routes/asko/+page.svelte` (+ `+page.ts` с `prerender`).
  Пререндер пишется как `asko.html`, скрипт `scripts/build-asko/flatten.mjs`
  поднимает его в корень (`index.html`) — витрина открывается на `/` своего домена.
- Изоляция: в основном билде `/asko` отдаёт 404 (страж
  `src/routes/asko/+layout.server.ts`, `SITE` там не задан). Перекрёстных ссылок нет.
- Оболочка: в asko-сборке рут-лейаут отдаёт голый каркас без шапки/подвала
  основного сайта (`data.site === 'asko'` в `+layout.server.ts` / `+layout.svelte`)
  и без походов в БД.

## Команды

```bash
npm run build:asko   # SITE=asko vite build + flatten → build-asko/
npm run build        # основной сайт, как раньше
```

Дев витрины: `SITE=asko npm run dev -- --port 5200` (в этом режиме основной каркас
не рендерится). Обычный `npm run dev` тоже показывает `/asko`, но внутри основного
каркаса — удобно для правок контента, не для оценки вида витрины.

Локальный просмотр статики: `python3 -m http.server 5197 --directory build-asko`.

## Известные особенности

- `build-asko` весит ~40 МБ: adapter-static кладёт ассеты всего приложения,
  включая неиспользуемые витриной (мёртвый груз, на выдачу и трафик страницы не
  влияет — грузится только нужное). Можно урезать скриптом-чистильщиком позже.
- Пререндер страницы, использующей БД, потребует БД на момент сборки (этап 2,
  каталог). Локально — поднять туннель к прод-базе перед `build:asko`; на VPS база локальна.
- Тема витрины: пока цвета заданы в самой странице (оверрайд SCSS-токенов в её
  `<style>`). На этапе 2 вынести в отдельный файл темы для asko-сборки.

## Деплой (руки Марата)

1. Залитый в main код → на VPS: `git pull && npm ci && npm run build && pm2 restart multibrand`
   (npm ci — появилась dev-зависимость `@sveltejs/adapter-static`).
2. `npm run build:asko` → на сервере появится `/home/username/multi-brand/build-asko`.
3. Домен: купить, в DNS A-записью на IP VPS.
4. Nginx vhost (черновик ниже) → `nginx -t && systemctl reload nginx`.
5. Сертификат: `certbot --nginx -d <домен> -d www.<домен>`.

### Черновик vhost

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name <домен> www.<домен>;

    root /home/username/multi-brand/build-asko;
    index index.html;

    # хешированные ассеты — кэш навсегда
    location /_app/immutable/ {
        add_header Cache-Control "public, immutable, max-age=31536000";
        try_files $uri =404;
    }

    # API основного приложения: картинки товаров (resize-прокси в S3)
    # и приём заявок. same-origin для витрины — CORS не нужен.
    location /api/ {
        proxy_pass http://127.0.0.1:5199; # порт pm2-процесса multibrand
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Обновление витрины на проде = `git pull && npm run build:asko` (pm2 не трогается,
статика подхватывается nginx'ом сама).

## Заявки с витрины

Лид-модалка — общий компонент `LeadRequestModal` с пропом `source="asko"`.
Заявка POST-ится в тот же `/api/leads` через nginx-прокси; письмо приходит с
темой «Новая заявка с витрины ASKO» и строкой «Источник: витрина ASKO».
Без пропа поведение прежнее (основной сайт).

## Тема витрины

- `src/lib/styles/variables.asko.scss` — `@forward './variables.scss' with (...)`:
  перекрывает брендовые цвета ($green/$green-light/$yellow) палитрой референса
  (тёмно-зелёный #123d2e + золото #d4af37). Для этого в variables.scss у этих
  цветов стоит `!default` — значения без темы те же.
- В asko-сборке препенд svelte-preprocess подключает файл темы вместо
  variables.scss (svelte.config.js) — все компоненты витрины и общий
  LeadRequestModal получают аско-палитру на уровне компиляции.
- Глобальные контролы (controls.scss) собираются vite напрямую с variables.scss,
  мимо темы, поэтому точечно перекрашиваются на обёртке `.asko-root`
  (src/routes/asko/+page.svelte): `.btn.primary`, `.input.primary`, тосты sonner.

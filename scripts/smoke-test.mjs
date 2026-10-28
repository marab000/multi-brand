#!/usr/bin/env node
// Функциональный smoke-тест: страницы открываются, в разметке есть ключевые маркеры,
// поисковые АПИ отвечают валидным JSON. Без зависимостей — чистый fetch (node 18+).
//
// Запуск:  npm run test:smoke                (против dev-сервера localhost:5199)
//          npm run test:smoke -- --base=http://localhost:3000
//
// Только GET-проверки: ничего не пишет в базу. Заказы/заявки тестируются руками
// или через /smoke (агент сделает это точечно).

const argBase = process.argv.find((a) => a.startsWith('--base='));
const BASE = (argBase ? argBase.slice(7) : process.env.SMOKE_BASE || 'http://localhost:5199').replace(/\/$/, '');

// [путь, подстрока, которая обязана быть в HTML/JSON ответе]
const pageChecks = [
  ['/', 'MULTIBRAND'],
  ['/catalog', ''],
  ['/brands', ''],
  ['/sale', ''],
  ['/cart', ''],
  ['/checkout', ''],
  ['/podbor', ''],
  ['/delivery', ''],
  ['/garantiya', ''],
  ['/about', ''],
  ['/offer', ''],
  ['/privacy', ''],
  ['/articles', ''],
  ['/favorites', '']
];

// АПИ: проверяем статус и что это JSON (фид — CSV, проверяем отдельно)
const apiChecks = [
  '/api/products/search?q=стиральная',
  '/api/search/suggestions?q=холодильник',
  '/api/slides',
  '/api/settings'
];

let failed = 0;
const results = [];

async function check(kind, path, test) {
  const url = BASE + path;
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    const problem = test(res, body);
    if (problem) {
      failed++;
      results.push(`FAIL  ${kind} ${path} — ${problem}`);
    } else {
      results.push(`ok    ${kind} ${path}`);
    }
  } catch (e) {
    failed++;
    results.push(`FAIL  ${kind} ${path} — ${e.name === 'TimeoutError' ? 'таймаут 15с' : e.message}`);
  }
}

// Merchant-фид: CSV с заголовком, проверяем статус и первую строку
await check('апи', '/api/feed', (res, body) => {
  if (res.status !== 200) return `статус ${res.status}`;
  if (!body.startsWith('ID,')) return 'нет CSV-заголовка';
  return null;
});

// Товар для страницы /products/[slug]: реальный слаг берём из merchant-фида (первая строка)
async function findProductSlug() {
  try {
    const res = await fetch(`${BASE}/api/feed`, { signal: AbortSignal.timeout(15000) });
    const csv = await res.text();
    const line = csv.split('\n')[1] || '';
    const url = line.match(/"?(https?:\/\/[^/]+\/products\/[^,"]+)/)?.[1];
    const slug = url?.split('/products/')[1];
    if (slug) return { slug: decodeURIComponent(slug), name: slug };
  } catch {
    // упадём в общий FAIL ниже
  }
  return { slug: null, name: 'фид не отдал ни одного товара' };
}

console.log(`Smoke-тест против ${BASE}\n`);

await Promise.all(
  pageChecks.map(([path, marker]) =>
    check('стр', path, (res, body) => {
      if (res.status !== 200) return `статус ${res.status}`;
      if (marker && !body.includes(marker)) return `нет маркера «${marker}»`;
      return null;
    })
  )
);
await Promise.all(
  apiChecks.map((path) =>
    check('апи', path, (res, body) => {
      if (res.status !== 200) return `статус ${res.status}`;
      try {
        JSON.parse(body);
      } catch {
        return 'ответ не JSON';
      }
      return null;
    })
  )
);

const found = await findProductSlug();
if (found.slug) {
  await check('стр', `/products/${found.slug}`, (res) => (res.status === 200 ? null : `статус ${res.status}`));
} else {
  failed++;
  results.push(`FAIL  доп  /products/[slug] — ${found.name}, страницу проверить нечем`);
}

console.log(results.join('\n'));
console.log(`\n${failed ? `❌ Провалено: ${failed}` : '✅ Всё ок'}`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
// Проверка перф-бюджета ключевых страниц.
// Использование:
//   node scripts/perf-check.mjs                       # локальный дев (5199)
//   BASE=https://multi-brand.online node scripts/perf-check.mjs   # прод
//   N=3 node scripts/perf-check.mjs                   # по 3 замера на страницу
// Выход: таблица с avg/max и статусом PASS/FAIL против бюджета. Код возврата 1 при провале.

const BASE = process.env.BASE || 'http://localhost:5199';
const SAMPLES = Number(process.env.N || 2);

// страница → бюджет полного времени ответа, мс
const PAGES = [
  { path: '/', budget: 1000, name: 'Главная' },
  { path: '/catalog', budget: 1500, name: 'Хаб каталога' },
  { path: '/catalog/vstraivaemaya-tehnika', budget: 2500, name: 'Корневая категория (5.6к товаров)' },
  { path: '/catalog/kuhonnye-moyki/moyki-iz-metalla-i-kamnya', budget: 1200, name: 'Подкатегория' },
  { path: '/products/bosch-hja737ba0', budget: 700, name: 'Товар' },
  { path: '/brands/bosch', budget: 700, name: 'Бренд-страница' },
  { path: '/cart', budget: 400, name: 'Корзина' },
  { path: '/sitemap.xml', budget: 1500, name: 'Sitemap (11к URL)' }
];

const fmt = (ms) => `${Math.round(ms)}мс`;
const results = [];
let failed = false;

console.log(`\nПерф-бюджет: ${BASE}, ${SAMPLES} замера на страницу\n`);

for (const { path, budget, name } of PAGES) {
  const times = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(BASE + path, { redirect: 'manual' });
      // читаем тело, чтобы замер был честным (до конца ответа)
      await res.arrayBuffer();
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      times.push(NaN);
      console.error(`  ⚠ ${path}: ${e.message}`);
      break;
    }
    times.push(performance.now() - t0);
    if (i < SAMPLES - 1) await new Promise((r) => setTimeout(r, 300));
  }
  if (times.some(isNaN)) {
    results.push({ name, path, status: 'FAIL (сеть)' });
    failed = true;
    continue;
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);
  const ok = avg <= budget;
  if (!ok) failed = true;
  results.push({
    name, path,
    avg: fmt(avg),
    max: fmt(max),
    budget: fmt(budget),
    status: ok ? 'PASS' : 'FAIL (превышен бюджет)'
  });
}

console.log('\n┌─ Результат ──────────────────────────────────────────┐');
for (const r of results) {
  console.log(`  ${String(r.name).padEnd(36)} avg ${String(r.avg).padStart(9)}  бюджет ${String(r.budget).padStart(9)}  ${r.status === 'PASS' ? '✅' : '❌'}`);
}
console.log('└──────────────────────────────────────────────────────┘');

if (failed) {
  console.error('\nПерф-бюджет ПРОВАЛЕН — смотри строки FAIL выше.');
  process.exit(1);
}
console.log('\nПерф-бюджет соблюдён ✅');

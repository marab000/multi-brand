// Акции Тетриса: логин puppeteer → куки → /sale/ (JSON-LD со всеми акциями) →
// матчинг брендов из brands.json → наши акции пишутся в settings.tetrasis_sale.
// Страница /sale на сайте читает этот ключ. Запуск: node scripts/fetch-tetrasis-sale/fetch.js
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import postgres from 'postgres';
import brands from '../sync-tetrasis-products/brands.json' with { type: 'json' };

const BASE = 'https://tetrasis-bt.ru';
const LOGIN = process.env.TETRAIS_LOGIN;
const PASSWORD = process.env.TETRAIS_PASSWORD;
const ROOT = path.resolve('scripts/fetch-tetrasis-sale');
const LOG = path.join(ROOT, 'fetch.log');

const log = (line) => {
  console.log(line);
  fs.appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`);
};

if (!LOGIN || !PASSWORD) {
  log('FATAL: нет TETRAIS_LOGIN/TETRAIS_PASSWORD в .env');
  process.exit(1);
}

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1
});

const decode = (t) =>
  t
    .replace(/&quot;/g, '\\"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const absolute = (u) => {
  if (!u) return null;
  const s = String(u);
  if (s.startsWith('http')) return s;
  // ld+json отдаёт пути вида 'tetrasis-bt.ru/upload/...' — домен без схемы
  if (s.startsWith('tetrasis-bt.ru')) return `https://${s}`;
  return `${BASE}/${s.replace(/^\//, '')}`;
};

const normalize = (t) => String(t || '').toLowerCase();

// описание акции: оставляем только безопасную разметку, ссылки на тетрис — в текст
function sanitizePromoHtml(html) {
  let s = String(html || '');
  s = s.replace(/<(script|style)[\s\S]*?<\/(script|style)>/gi, '');
  s = s.replace(/<a[^>]*>/gi, '<span>').replace(/<\/a>/gi, '</span>');
  s = s.replace(/<(p|span|b|strong|u|i|em|ul|ol|li)([^>]*)>/gi, '<$1>');
  s = s.replace(/<\/(?!\/(p|span|b|strong|u|i|em|br|ul|ol|li)\b)[a-z][a-z0-9]*[^>]*>/gi, '');
  return s.trim();
}

const slugOf = (url) => String(url || '').replace(/\/$/, '').split('/').pop();

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    // нужна только разметка — картинки/шрифты не грузим
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const t = req.resourceType();
      if (t === 'image' || t === 'media' || t === 'font') req.abort().catch(() => {});
      else req.continue().catch(() => {});
    });

    await page.goto(`${BASE}/auth/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#USER_LOGIN_POPUP', { timeout: 20000 });
    await page.type('#USER_LOGIN_POPUP', LOGIN, { delay: 15 });
    await page.type('#USER_PASSWORD_POPUP', PASSWORD, { delay: 15 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null),
      page.click('input[name="Login"]')
    ]);
    log(`логин: ${page.url()}`);

    const cookies = await page.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const res = await fetch(`${BASE}/sale/`, {
      headers: { Cookie: cookieHeader, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    });
    const html = await res.text();
    log(`sale: ${res.status}, ${html.length} байт`);

    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const promosRaw = ldMatch ? JSON.parse(decode(ldMatch[1])) : [];
    log(`акций у Тетриса: ${promosRaw.length}`);

    const all = [];
    for (const promo of promosRaw) {
      const haystack = `${normalize(promo.headline)} ${normalize(promo.articleBody || '')}`;
      const brand = brands.find((b) => haystack.includes(normalize(b))) ?? null;
      all.push({
        headline: promo.headline ?? '',
        brand,
        url: absolute(promo.url),
        image: absolute(promo.image?.[0] ?? null),
        datePublished: promo.datePublished ?? null
      });
    }
    const ours = all
      .filter((p) => p.brand)
      .map((p) => ({ ...p, slug: slugOf(p.url) }))
      // битые url от битрикса (например '.../Array') — в мусор
      .filter((p) => /^[a-z0-9_-]+$/.test(p.slug) && /^https:\/\/tetrasis-bt\.ru\/sale\//.test(p.url ?? ''));
    log(`наших брендов: ${ours.length} из ${all.length} (скипнуто: ${all.length - ours.length})`);

    // каждая акция: дата и полное описание со страницы акции
    let done = 0;
    for (const promo of ours) {
      try {
        await page.goto(promo.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise((r) => setTimeout(r, 700));
        const detailHtml = await page.content();
        const dateM = detailHtml.match(/<span class="date">([^<]*)<\/span>/);
        const descM = detailHtml.match(/<div class="content">([\s\S]*?)<\/div>/);
        promo.dateText = dateM ? dateM[1].trim() : null;
        promo.descriptionHtml = sanitizePromoHtml(descM ? descM[1] : '');
        done++;
        if (done % 10 === 0) log(`  обработано ${done}/${ours.length}`);
      } catch (e) {
        log(`  detail fail: ${promo.slug} — ${e.message.slice(0, 70)}`);
      }
    }
    log(`детали собраны: ${done}/${ours.length}`);

    const payload = JSON.stringify({ updated_at: new Date().toISOString(), promos: ours });
    await sql`
      insert into settings (key, value, updated_at)
      values ('tetrasis_sale', ${payload}, now())
      on conflict (key) do update set value = ${payload}, updated_at = now()
    `;
    log('записано в settings.tetrasis_sale');
    await sql.end();
  } catch (e) {
    log(`FATAL: ${e.stack || e.message}`);
    await sql.end().catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();

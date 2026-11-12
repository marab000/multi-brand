// Загрузка GEO-текстов сеошника (папка HTML) в seo_overrides.section_text.
// Обновляет ТОЛЬКО section_text — title/description/h1/canonical не трогает.
// Подробности запуска — в README.md рядом.
//
// Usage: node scripts/load-geo-section-texts/load.mjs [--only 02_dvuhkamernye-holodilniki] [--dry-run]
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const DEFAULT_DIR = '/Users/maratnugmanov/Downloads/Multi_Brand_GEO_HTML_November_2026';

// Маппинг «файл сеошника → page_key категории».
// Развилки решены по дереву каталога и числу товаров (2026-11-12):
//   06 винные — vstraivaemaya-ветка: 111 встраиваемых vs 55 отдельностоящих
//   08 автоматы — «Приготовление кофе» мелкой БТ (автоматы живут в melkaya root)
//   15 45см — krupnaya/kompaktnye: 13 товара vs 2 в vstraivaemaya/kompaktnye
//   16 60см — vstraivaemaya/polnorazmernye: 379 vs 63
const MAP = {
  '01_holodilniki.html': 'category:krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki',
  '02_dvuhkamernye-holodilniki.html':
    'category:krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/dvuhkamernye-holodilniki',
  '03_vstraivaemye-holodilniki.html': 'category:vstraivaemaya-tehnika/holodilniki-i-morozilniki',
  '04_morozilnye-kamery.html':
    'category:krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/morozilnye-kamery',
  '05_morozilnye-lari.html':
    'category:krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/morozilnye-lari',
  '06_vinnye-shkafy.html': 'category:vstraivaemaya-tehnika/vinnye-shkafy',
  '07_kofemashiny.html': 'category:vstraivaemaya-tehnika/kofemashiny',
  '08_avtomaticheskie-kofemashiny.html': 'category:melkaya-bytovaya-tehnika/prigotovlenie-kofe',
  '09_vstraivaemye-kofemashiny.html': 'category:vstraivaemaya-tehnika/kofemashiny/vstraivaemye-kofemashiny',
  '10_gazovye-plity.html': 'category:krupnaya-bytovaya-tehnika/plity/gazovye-plity',
  '11_elektricheskie-plity.html': 'category:krupnaya-bytovaya-tehnika/plity/elektricheskie-plity',
  '12_kombinirovannye-plity.html': 'category:krupnaya-bytovaya-tehnika/plity/kombinirovannye-plity',
  '13_otdelnostoyashchie-posudomoechnye-mashiny.html':
    'category:krupnaya-bytovaya-tehnika/posudomoechnye-mashiny',
  '14_vstraivaemye-posudomoechnye-mashiny.html':
    'category:vstraivaemaya-tehnika/posudomoechnye-mashiny',
  '15_posudomoechnye-mashiny-45-sm.html':
    'category:krupnaya-bytovaya-tehnika/posudomoechnye-mashiny/kompaktnye',
  '16_posudomoechnye-mashiny-60-sm.html':
    'category:vstraivaemaya-tehnika/posudomoechnye-mashiny/polnorazmernye',
  '17_stiralnye-mashiny.html': 'category:krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny',
  '18_frontalnye-stiralnye-mashiny.html':
    'category:krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/frontalnye-stiralnye-mashiny',
  '19_vertikalnye-stiralnye-mashiny.html':
    'category:krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/vertikalnye-stiralnye-mashiny',
  '20_stiralno-sushilnye-mashiny.html':
    'category:krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/stiralno-sushilnye-mashiny',
  '21_sushilnye-mashiny.html':
    'category:krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-mashiny',
  '22_sushilnye-shkafy.html':
    'category:krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-shkafy',
  '23_duhovye-shkafy.html': 'category:vstraivaemaya-tehnika/duhovye-shkafy',
  '24_varochnye-paneli.html': 'category:vstraivaemaya-tehnika/varochnye-poverhnosti',
  '25_kuhonnye-vytyazhki.html': 'category:kuhonnye-vytyazhki',
  '26_kuhonnye-moyki.html': 'category:kuhonnye-moyki',
  '27_kuhonnye-smesiteli.html': 'category:smesiteli',
  '28_izmelchiteli-pishchevyh-othodov.html': 'category:izmelchiteli-pischevyh-othodov',
  '29_melkaya-bytovaya-tehnika.html': 'category:melkaya-bytovaya-tehnika'
};

const args = process.argv.slice(2);
const onlyArg = (() => {
  const i = args.indexOf('--only');
  return i !== -1 ? args[i + 1] : null;
})();
const DRY_RUN = args.includes('--dry-run');

const dir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : DEFAULT_DIR;
const entries = Object.entries(MAP).filter(([file]) => !onlyArg || file.startsWith(onlyArg));
if (!entries.length) {
  console.error('нет файлов для загрузки (проверь --only)');
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const sql = postgres({
  host: 'localhost',
  port: 5433,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD
});

// --- бэкап существующих section_text (до любой перезаписи) ---
const keys = entries.map(([, key]) => key);
const existing = await sql`
  SELECT page_key, section_text, updated_by, updated_at
  FROM seo_overrides
  WHERE page_key IN ${sql(keys)}
`;
if (existing.length) {
  // уникальное имя: повторный запуск не перетирает бэкап первого
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const backupPath = path.join('scripts/load-geo-section-texts', `backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(existing, null, 2));
  console.log(`бэкап ${existing.length} существующих строк → ${backupPath}`);
}

let loaded = 0;
for (const [file, key] of entries) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`✗ ${file}: файла нет в ${dir}`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8').trim();
  const unknownTags = [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)/g)]
    .map((m) => m[1].toLowerCase())
    .filter((t) => !['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'br'].includes(t));
  if (unknownTags.length) {
    console.error(`✗ ${file}: посторонние теги ${[...new Set(unknownTags)].join(', ')} — пропуск, согласовать`);
    continue;
  }
  const placeholders = [...new Set(html.match(/\{[a-z_]+\}/g) ?? [])];
  console.log(`${DRY_RUN ? '[dry] ' : ''}${file} → ${key} (${html.length} симв., плейсхолдеры: ${placeholders.join(', ') || '—'})`);
  if (DRY_RUN) continue;
  await sql`
    INSERT INTO seo_overrides (page_key, section_text, updated_by)
    VALUES (${key}, ${html}, 'seed:geo-html-nov2026')
    ON CONFLICT (page_key) DO UPDATE SET
      section_text = ${html}, updated_at = now(), updated_by = 'seed:geo-html-nov2026'
  `;
  loaded++;
}
console.log(DRY_RUN ? `dry-run: проверено ${entries.length}` : `загружено текстов: ${loaded}`);
await sql.end();

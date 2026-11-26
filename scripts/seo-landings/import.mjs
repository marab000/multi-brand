// Импорт GEO-текстов и H1 (14 зелёных посадочных из SEO-таблицы «HTML GEO — Ноябрь 2026»)
// в seo_overrides. Апсертит ТОЛЬКО h1 + section_text — ручные title/description/canonical
// не трогает (мета собирается из H1, см. src/lib/server/metaFromH1.ts).
//
// Запуск: node scripts/seo-landings/import.mjs [--dry]
// База: из .env (DB_*; прод — через туннель 5433). Существующие тексты сравниваются:
// совпадают — обновляется только h1; отличаются — печатается предупреждение.
import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dry = process.argv.includes('--dry');
const here = dirname(fileURLToPath(import.meta.url));

// n — номер из колонки «№» таблицы «HTML GEO — Ноябрь 2026»
const IMPORTS = [
  { n: 1, key: 'landing:krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/holodilniki', h1: 'Холодильники' },
  { n: 3, key: 'category:vstraivaemaya-tehnika/holodilniki-i-morozilniki', h1: 'Встраиваемые холодильники' },
  { n: 6, key: 'category:krupnaya-bytovaya-tehnika/vinnye-shkafy', h1: 'Винные шкафы для дома' },
  { n: 7, key: 'landing:kofemashiny', h1: 'Кофемашины для дома' },
  { n: 8, key: 'landing:kofemashiny/avtomaticheskie', h1: 'Автоматические кофемашины' },
  { n: 9, key: 'category:vstraivaemaya-tehnika/kofemashiny/vstraivaemye-kofemashiny', h1: 'Встраиваемые кофемашины' },
  { n: 13, key: 'category:krupnaya-bytovaya-tehnika/posudomoechnye-mashiny', h1: 'Отдельностоящие посудомоечные машины' },
  { n: 14, key: 'category:vstraivaemaya-tehnika/posudomoechnye-mashiny', h1: 'Встраиваемые посудомоечные машины' },
  { n: 15, key: 'landing:krupnaya-bytovaya-tehnika/posudomoechnye-mashiny/posudomoechnye-mashiny-45-sm', h1: 'Посудомоечные машины 45 см' },
  { n: 16, key: 'landing:krupnaya-bytovaya-tehnika/posudomoechnye-mashiny/posudomoechnye-mashiny-60-sm', h1: 'Посудомоечные машины 60 см' },
  { n: 17, key: 'landing:krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/stiralnye-mashiny', h1: 'Стиральные машины' },
  { n: 21, key: 'category:krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-mashiny', h1: 'Сушильные машины для белья' },
  { n: 23, key: 'category:vstraivaemaya-tehnika/duhovye-shkafy', h1: 'Духовые шкафы' },
  { n: 27, key: 'category:smesiteli', h1: 'Смесители для кухни' }
];

const UPDATED_BY = 'agent:seo-landings-nov2026';

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

let created = 0, h1Only = 0, textOverwritten = 0, same = 0;

for (const item of IMPORTS) {
  const file = join(here, 'html', `${String(item.n).padStart(2, '0')}.html`);
  const text = readFileSync(file, 'utf8').trim();
  if (!text) throw new Error(`пустой файл ${file}`);

  const existing = await sql`
    SELECT h1, section_text FROM seo_overrides WHERE page_key = ${item.key} LIMIT 1
  `;
  const oldText = existing[0]?.section_text ?? null;
  const oldH1 = existing[0]?.h1 ?? null;

  if (oldText === text) same++;
  else if (oldText != null) {
    textOverwritten++;
    console.log(`⚠ ${item.key}: текст перезаписывается (старый ${oldText.length} → новый ${text.length} симв.)`);
  } else created++;

  if (!dry) {
    // title/description/canonical не трогаем: мета собирается из H1
    await sql`
      INSERT INTO seo_overrides (page_key, title, description, h1, canonical, section_text, updated_by)
      VALUES (${item.key}, NULL, NULL, ${item.h1}, NULL, ${text}, ${UPDATED_BY})
      ON CONFLICT (page_key) DO UPDATE SET
        h1 = ${item.h1},
        section_text = ${text},
        updated_at = now(),
        updated_by = ${UPDATED_BY}
    `;
  }
  const action = oldText === text ? (oldH1 === item.h1 ? 'без изменений' : 'h1 обновлён') : oldText ? 'текст+h1' : 'создана';
  console.log(`${dry ? '[dry] ' : ''}${item.key} → ${action}; h1: ${oldH1 ?? '—'} → ${item.h1}`);
}

console.log(`\nИтог: создано ${created}, текст совпал у ${same}, перезаписано текстов ${textOverwritten}${dry ? ' (DRY RUN — ничего не записано)' : ''}`);
await sql.end();

// Рекон по прод-БД (read-only): наборы товаров для 14 зелёных посадочных
// Запуск: node scripts/seo-landings/recon.mjs  (читает .env: DB_* → туннель 5433)
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const q = async (title, query) => {
  const rows = await sql.unsafe(query);
  console.log(`\n=== ${title} ===`);
  for (const r of rows) console.log(r);
  return rows;
};

await q('Распределение кофейных товаров (корень/группа/лист/тип)',
  `SELECT catalog_root_slug, catalog_group_slug, catalog_leaf_slug, product_type, count(*)::int AS n
   FROM products
   WHERE price_rrc IS NOT NULL AND (
     product_type ILIKE '%кофе%' OR category ILIKE '%кофе%'
     OR raw->>'ЦеноваяГруппа' ILIKE '%кофе%' OR raw->>'ГруппаАналитическогоУчета' ILIKE '%кофе%')
   GROUP BY 1,2,3,4 ORDER BY n DESC`);

await q('Признак «автоматическая» среди кофе (product_type / спеки / имя)',
  `SELECT count(*) FILTER (WHERE product_type ILIKE '%автомат%')::int AS type_auto,
          count(*) FILTER (WHERE specs::text ILIKE '%автомат%')::int AS specs_auto,
          count(*) FILTER (WHERE name ILIKE '%автомат%')::int AS name_auto,
          count(*) FILTER (WHERE raw::text ILIKE '%автомат%')::int AS raw_auto,
          count(*)::int AS total_coffee
   FROM products
   WHERE price_rrc IS NOT NULL AND (product_type ILIKE '%кофе%' OR category ILIKE '%кофе%')`);

await q('Примеры кофейных карточек: имя + тип + ключи спек',
  `SELECT name, product_type,
     (SELECT string_agg(DISTINCT k, '; ') FROM jsonb_object_keys(specs) k) AS spec_keys
   FROM products
   WHERE price_rrc IS NOT NULL AND (product_type ILIKE '%кофе%' OR category ILIKE '%кофе%')
   LIMIT 12`);

await q('Спека «Тип» у кофемашин (значения для отбора автоматических)',
  `SELECT specs->>'Тип' AS tip, count(*)::int AS n
   FROM products
   WHERE price_rrc IS NOT NULL AND product_type ILIKE '%кофе%'
   GROUP BY 1 ORDER BY n DESC`);

await q('Посудомойки: корень/группа/лист/тип + ширина (число из спек)',
  `SELECT catalog_root_slug, catalog_group_slug, catalog_leaf_slug, product_type, count(*)::int AS n,
     min(width_val)::float AS w_min,
     max(width_val)::float AS w_max,
     count(width_val)::int AS w_known
   FROM (
     SELECT catalog_root_slug, catalog_group_slug, catalog_leaf_slug, product_type,
       NULLIF(regexp_replace(replace(coalesce(specs->>'Размер (Ширина)', specs->>'Размер (Ширина), см', specs->>'Ширина прибора',''), ',', '.'), '[^0-9.]', '', 'g'), '')::float AS width_val
     FROM products
     WHERE price_rrc IS NOT NULL AND (product_type ILIKE '%посудомо%' OR name ILIKE '%посудомо%' OR catalog_group_slug = 'posudomoechnye-mashiny')
   ) t GROUP BY 1,2,3,4 ORDER BY 1,2,3,4`);

await q('Гистограмма ширин посудомоек (КБТ+ВТ)',
  `SELECT width, count(*)::int AS n FROM (
     SELECT NULLIF(regexp_replace(replace(coalesce(specs->>'Размер (Ширина)', specs->>'Размер (Ширина), см', specs->>'Ширина прибора',''), ',', '.'), '[^0-9.]', '', 'g'), '')::float AS width
     FROM products
     WHERE price_rrc IS NOT NULL AND (product_type ILIKE '%посудомо%' OR name ILIKE '%посудомо%')
   ) t WHERE width IS NOT NULL GROUP BY 1 ORDER BY 1`);

await q('Факты по группе А (8 page_key): наличие товаров',
  `SELECT catalog_root_slug, catalog_group_slug, catalog_leaf_slug, count(*)::int AS n
   FROM products
   WHERE price_rrc IS NOT NULL AND (
     (catalog_root_slug = 'vstraivaemaya-tehnika' AND catalog_group_slug = 'holodilniki-i-morozilniki') OR
     (catalog_root_slug = 'krupnaya-bytovaya-tehnika' AND catalog_group_slug = 'vinnye-shkafy') OR
     (catalog_root_slug = 'vstraivaemaya-tehnika' AND catalog_group_slug = 'kofemashiny') OR
     (catalog_group_slug = 'posudomoechnye-mashiny') OR
     (catalog_group_slug = 'stiralnye-i-sushilnye-mashiny') OR
     (catalog_root_slug = 'smesiteli') OR
     (catalog_root_slug = 'melkaya-bytovaya-tehnika'))
   GROUP BY 1,2,3 ORDER BY 1,2,3`);

await q('Холодильные листья КБТ (для лендинга «Холодильники»)',
  `SELECT catalog_leaf_slug, count(*)::int AS n
   FROM products
   WHERE price_rrc IS NOT NULL AND catalog_root_slug='krupnaya-bytovaya-tehnika'
     AND catalog_group_slug='holodilniki-i-morozilniki'
   GROUP BY 1 ORDER BY 1`);

await q('Стиральные: листья КБТ + ВТ (для лендинга «Стиральные машины»)',
  `SELECT catalog_root_slug, catalog_leaf_slug, count(*)::int AS n
   FROM products
   WHERE price_rrc IS NOT NULL AND catalog_group_slug='stiralnye-i-sushilnye-mashiny'
   GROUP BY 1,2 ORDER BY 1,2`);

await q('Сушильные машины лист (факт)',
  `SELECT count(*)::int AS n FROM products
   WHERE price_rrc IS NOT NULL AND catalog_root_slug='krupnaya-bytovaya-tehnika'
     AND catalog_group_slug='stiralnye-i-sushilnye-mashiny' AND catalog_leaf_slug='sushilnye-mashiny'`);

await sql.end();
console.log('\nRECON DONE');

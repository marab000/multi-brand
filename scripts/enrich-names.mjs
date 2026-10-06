// Разовое обогащение названий тетрис-товаров: «ASKO W4086C» → «ASKO W4086C стиральная машина».
// Слаг считается от имени — старые ссылки продолжает отдавать api/products/[slug] (матч по raw-имени),
// страница делает 301 на новый слаг.
import postgres from 'postgres';

const RULES = [
  [/стиральн/i, 'стиральная машина'],
  [/посудомо/i, 'посудомоечная машина'],
  [/духов/i, 'духовой шкаф'],
  [/(варочн|поверхност|панел)/i, 'варочная панель'],
  [/(вытяж|зонт|наклон|т-образ)/i, 'вытяжка'],
  [/(холодил|винн|минибар|сигар)/i, 'холодильник'],
  [/(морозил|ларь)/i, 'морозильник'],
  [/(микроволн|свч)/i, 'СВЧ'],
  [/(смесител|излив)/i, 'смеситель'],
  [/мойк/i, 'мойка'],
  [/измельчит/i, 'измельчитель'],
  [/(сушил|сушк)/i, 'сушильная машина'],
  [/(кофе)/i, 'кофемашина'],
  [/плит/i, 'плита']
];

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const rows = await sql`
  select id, name, product_type from products
  where source = 'tetrasis-api' and price_rrc is not null and product_type is not null
    and name is not null`;

let enriched = 0, skipped = 0;
let done = 0;
for (const row of rows) {
  const label = RULES.find(([re]) => re.test(row.product_type))?.[1];
  if (!label) { skipped++; continue; }
  if (new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(row.name)) { skipped++; continue; }
  await sql`update products set name = ${row.name + ' ' + label} where id = ${row.id}::uuid`;
  enriched++;
  done++;
  if (done % 500 === 0) console.log(`  обновлено ${done}`);
}
console.log(`обогащено: ${enriched}, пропущено (тип уже в названии): ${skipped}`);
await sql.end();

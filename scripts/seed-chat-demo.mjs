// Сид 10 демо-диалогов для проверки чат-админки.
// Запуск: node --env-file=.env scripts/seed-chat-demo.mjs
// Пишет ДЕМО-данные в прод-базу — после показа заказчику можно удалить:
// DELETE FROM chat_messages WHERE thread_id IN (SELECT id FROM chat_threads WHERE client_name = 'Демо');
// DELETE FROM chat_threads WHERE client_name = 'Демо';
import postgres from 'postgres';

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const demos = [
  { name: 'Демо', first: 'Здравствуйте! Подскажите, есть ли холодильники Bosch Side-by-Side в наличии?', replies: ['Добрый день! Да, 4 модели в наличии на складе М-7, можем показать сегодня в шоуруме.'] },
  { name: 'Демо', first: 'Какая варочная панель подойдёт под нишу 56 см?', replies: ['Под нишу 56 см смотрим индукционные 60 см с боковым управлением — есть 12 вариантов от 39 900 ₽.'] },
  { name: 'Демо', first: 'Делаете ли скидку на комплект духовой шкаф + вытяжка?', replies: ['Да, на комплект из 3 приборов скидка до −20%. Какие бренды интереснее: Korting или Kuppersberg?'] },
  { name: 'Демо', first: 'Хранение до конца ремонта — сколько это стоит?', replies: ['Бесплатно при покупке от 3 приборов: зафиксируем цены и храним на тёплом складе до готовности кухни.'] },
  { name: 'Демо', first: 'Есть ли посудомойки 45 см компактные?', replies: ['Есть 7 компактных моделей от 41 900 ₽. Для двоих человек — оптимальный вариант.'] },
  { name: 'Демо', first: 'Микроволновку встраиваемую можно посмотреть вживую?', replies: ['Конечно, в шоуруме на Чистопольской 66 — ежедневно 9:00–18:00. К какой модели присматриваетесь?'] },
  { name: 'Демо', first: 'Рассрочка реально без переплат?', replies: ['Да, 0% на 12 месяцев, оформление онлайн за 2 минуты, первый взнос не нужен.'] },
  { name: 'Демо', first: 'Стиралку ASKO доставите и подключите?', replies: ['Доставка и монтаж входят при покупке комплекта. По стиральной — подключим к коммуникациям на следующий день.'] },
  { name: 'Демо', first: 'Проверьте, встанет ли вытяжка 60 см над варочной Korting.', replies: ['Проверю совместимость и зазоры — пришлите размеры ниши, отвечу схемой встройки.'] },
  { name: 'Демо', first: 'Винный шкаф на 40 бутылок существует или это миф?', replies: ['Существует: от 20 990 ₽, два температурных режима. Показать в шоуруме?'] }
];

for (const d of demos) {
  const id = crypto.randomUUID();
  await sql`INSERT INTO chat_threads (id, client_name, status) VALUES (${id}, ${d.name}, 'open')`;
  await sql`
    INSERT INTO chat_messages (thread_id, sender, text)
    VALUES (${id}, 'client', ${d.first})
  `;
  for (const reply of d.replies) {
    await sql`
      INSERT INTO chat_messages (thread_id, sender, text)
      VALUES (${id}, 'operator', ${reply})
    `;
  }
  await sql`UPDATE chat_threads SET unread = 1 WHERE id = ${id}`;
}

const total = await sql`SELECT count(*) FROM chat_threads`;
console.log(`seeded 10 demo threads, total threads: ${total[0].count}`);
await sql.end();

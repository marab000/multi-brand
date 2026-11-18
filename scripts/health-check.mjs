// Автопроверка отправки писем: живой ли ключ NotiSend, хватает ли средств,
// и (по флагу --send-test) доходит ли письмо до ящика по факту.
// Ни одного лишнего письма не отправляет: e2e-щуп работает только с флагом.
// Запуск на VPS по крону каждые 3 часа (без флага) и раз в сутки с флагом:
//   node --env-file=.env scripts/health-check.mjs
//   node --env-file=.env scripts/health-check.mjs --send-test
// Результат — settings.health_check, его читает админка (красная кнопка профиля).

import postgres from 'postgres';

const NOTISEND_API = 'https://api.notisend.ru/v1';
const HEALTH_KEY = 'health_check';
// статусы, при которых e2e-письмо считается доехавшим
const DELIVERED = 'delivered';
const FAILED = ['hard_bounced', 'soft_bounced', 'skipped'];

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const authHeaders = {
  Authorization: `Bearer ${process.env.NOTISEND_API_KEY}`,
  'Content-Type': 'application/json'
};

// Щуп 1: живой ли ключ и что с балансом. GET дешевле POST и ничего не шлёт.
// 200 = ключ принят; 401 = ключ отозван/неактивен; 402 = денег/писем нет.
async function probeKeyAlive() {
  try {
    const res = await fetch(`${NOTISEND_API}/email/balance`, { headers: authHeaders });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const credits = data?.tariff?.credits;
      const available = data?.tariff?.subscribers?.available;
      // ёмкость отправки = платные письма ИЛИ свободные слоты подписчиков;
      // оба нули = слать некуда (бесплатный тариф исчерпан / денег нет)
      if (Number.isFinite(credits) && credits <= 0 && Number.isFinite(available) && available <= 0) {
        return {
          keyAlive: true,
          balance: data?.balance ?? null,
          credits: credits ?? null,
          available: available ?? null,
          ok: false,
          error: `NotiSend: ёмкость исчерпана — нет ни писем (credits=0), ни слотов подписчиков; освободите базу или пополните тариф`
        };
      }
      return {
        keyAlive: true,
        balance: data?.balance ?? null,
        credits: credits ?? null,
        available: available ?? null,
        ok: true
      };
    }
    const body = await res.text();
    return {
      keyAlive: false,
      ok: false,
      error: `Ключ NotiSend: HTTP ${res.status} ${body.slice(0, 200)}`
    };
  } catch (e) {
    return { keyAlive: false, ok: false, error: `Ключ NotiSend: запрос не прошёл — ${e.message}` };
  }
}

// Щуп 2 (по флагу): сквозная отправка тест-письма на HEALTH_TEST_EMAIL
// с опросом статуса. Ловит то, что не видит щуп 1: домен слетел,
// письма падают в спам, DKIM не сошёлся.
async function probeEndToEnd() {
  const to = process.env.HEALTH_TEST_EMAIL;
  if (!to) return { testSend: null, error: 'HEALTH_TEST_EMAIL не задан — e2e-щуп пропущен' };
  try {
    const send = await fetch(`${NOTISEND_API}/email/messages`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        from_email: (process.env.NOTISEND_FROM_EMAIL ?? '').match(/<([^>]+)>/)?.[1] ?? process.env.NOTISEND_FROM_EMAIL,
        to,
        subject: 'Селф-чек писем multi-brand.online',
        text: 'Автопроверка доставки: если видите это письмо — почта жива.'
      })
    });
    if (!send.ok) {
      const body = await send.text();
      return { testSend: false, error: `e2e-отправка: HTTP ${send.status} ${body.slice(0, 200)}` };
    }
    const msg = await send.json().catch(() => null);
    const id = msg?.id;
    if (!id) return { testSend: false, error: 'e2e-отправка: нет id сообщения в ответе' };
    // опрашиваем статус до 2 минут
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const poll = await fetch(`${NOTISEND_API}/email/messages/${id}`, { headers: authHeaders });
      const data = await poll.json().catch(() => null);
      const status = data?.status;
      if (status === DELIVERED) return { testSend: true, status };
      if (FAILED.includes(status)) return { testSend: false, status, error: `e2e: письмо не доехало — статус ${status}` };
    }
    return { testSend: null, error: `e2e: статус так и не стал финальным за 2 мин (id=${id})` };
  } catch (e) {
    return { testSend: false, error: `e2e-отправка: запрос не прошёл — ${e.message}` };
  }
}

const key = await probeKeyAlive();
const test = process.argv.includes('--send-test') ? await probeEndToEnd() : { testSend: null };
const result = {
  checkedAt: new Date().toISOString(),
  keyAlive: key.keyAlive,
  // NotiSend не отдаёт статус домена по API — если нужен этот щуп, его роль
  // выполняет e2e-письмо (--send-test); null = «не проверяем», на ok не влияет
  domainStatus: null,
  balance: key.balance ?? null,
  credits: key.credits ?? null,
  testSend: test.testSend ?? null,
  ok: key.ok === true && (test.testSend !== false),
  error: key.error ?? test.error ?? null
};

const json = JSON.stringify(result);
await sql`
  insert into settings (key, value, updated_at)
  values (${HEALTH_KEY}, ${json}, now())
  on conflict (key) do update set value = ${json}, updated_at = now()
`;
await sql.end();

console.log(
  `health-check: ok=${result.ok} keyAlive=${result.keyAlive} credits=${result.credits ?? '—'} test=${result.testSend ?? '—'}${result.error ? ` | ${result.error}` : ''}`
);
process.exit(result.ok ? 0 : 1);

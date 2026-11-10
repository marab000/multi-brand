// Автопроверка отправки писем: ключ Resend жив? домен verified?
// Ни одного письма не отправляет: пустой POST падает на валидации ДО отправки.
// Запуск на VPS по крону каждые 3 часа:
//   node --env-file=.env scripts/health-check.mjs
// Результат — settings.health_check, его читает админка (красная кнопка профиля).

import postgres from 'postgres';

const RESEND_API = 'https://api.resend.com/emails';
const RESEND_DOMAINS_API = 'https://api.resend.com/domains';
const DOMAIN = 'multi-brand.online';
const HEALTH_KEY = 'health_check';

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Щуп 1: живой ли send-ключ. Пустое тело → 422 (валидация) = ключ принят,
// 401/403 = ключ отозван/неверен. Письмо при 422 не отправляется.
async function probeKeyAlive() {
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (res.status === 422) return { keyAlive: true };
    const body = await res.text();
    return { keyAlive: false, error: `Ключ Resend: HTTP ${res.status} ${body.slice(0, 200)}` };
  } catch (e) {
    return { keyAlive: false, error: `Ключ Resend: запрос не прошёл — ${e.message}` };
  }
}

// Щуп 2: статус домена (та самая поломка — статус слетает без изменения DNS).
// Нужен read-ключ (dashboard → API Keys, доступ на чтение); без него — пропускаем.
async function probeDomain() {
  if (!process.env.RESEND_READ_KEY) return { domainStatus: null };
  try {
    const res = await fetch(RESEND_DOMAINS_API, {
      headers: { Authorization: `Bearer ${process.env.RESEND_READ_KEY}` }
    });
    if (!res.ok) {
      return { domainStatus: 'unknown', error: `Статус домена: HTTP ${res.status}` };
    }
    const data = await res.json();
    const domain = (data.data ?? []).find((d) => d.name === DOMAIN);
    if (!domain) return { domainStatus: 'missing', error: `Домен ${DOMAIN} не найден в Resend` };
    return { domainStatus: domain.status };
  } catch (e) {
    return { domainStatus: 'unknown', error: `Статус домена: запрос не прошёл — ${e.message}` };
  }
}

const key = await probeKeyAlive();
const domain = await probeDomain();
const result = {
  checkedAt: new Date().toISOString(),
  keyAlive: key.keyAlive,
  // без read-ключа domainStatus = null: «не проверяем», на ok не влияет
  domainStatus: domain.domainStatus ?? null,
  ok: key.keyAlive && (domain.domainStatus == null || domain.domainStatus === 'verified'),
  error: key.error ?? domain.error ?? null
};

const json = JSON.stringify(result);
await sql`
  insert into settings (key, value, updated_at)
  values (${HEALTH_KEY}, ${json}, now())
  on conflict (key) do update set value = ${json}, updated_at = now()
`;
await sql.end();

console.log(`health-check: ok=${result.ok} keyAlive=${result.keyAlive} domain=${result.domainStatus ?? '—'}${result.error ? ` | ${result.error}` : ''}`);
process.exit(result.ok ? 0 : 1);

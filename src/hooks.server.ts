import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSessionCookie, validateSessionToken } from '$lib/server/auth';
import { sql } from '$lib/db';

let slidesMigrated = false;
async function ensureSlidesTable() {
  if (slidesMigrated) return;
  await sql`
    create table if not exists slides (
      id serial primary key,
      desktop_url text not null,
      mobile_url text not null,
      position int not null default 0,
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists settings (
      key text primary key,
      value text not null,
      updated_at timestamptz not null default now()
    )
  `;
  // Дефолтное значение скидки
  await sql`
    insert into settings (key, value)
    values ('cart_discount_percent', '15')
    on conflict (key) do nothing
  `;
  // Дефолтные исключённые бренды
  await sql`
    insert into settings (key, value)
    values ('excluded_brands', '["asko","omoikiri","franke"]')
    on conflict (key) do nothing
  `;
  // Скидка за комплект (конструктор «Собери кухню»)
  await sql`
    insert into settings (key, value)
    values ('bundle_discount_enabled', 'false'), ('bundle_discount_percent', '5')
    on conflict (key) do nothing
  `;
  // Конфиг викторины «Собери кухню» (бренды, приоритетные товары, тексты — задел)
  await sql`
    insert into settings (key, value)
    values (
      'podbor_config',
      '{"version":1,"brands":{"mode":"all","whitelist":[],"blacklist":[]},"priorityProducts":[],"texts":{}}'
    )
    on conflict (key) do nothing
  `;
  await sql`
    create table if not exists articles (
      id serial primary key,
      slug text unique not null,
      title text not null,
      description text not null default '',
      cover_url text not null default '',
      is_published boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists article_blocks (
      id serial primary key,
      article_id int not null references articles(id) on delete cascade,
      position int not null default 0,
      type text not null,
      content jsonb not null default '{}'
    )
  `;
  await sql`create index if not exists article_blocks_article_id_idx on article_blocks(article_id)`;
  // Роли пользователя (массив): designer = скидка в КП, sales = доступ к отчётам и т.д.
  // Ставятся вручную в БД: update users set roles='{designer}' where email='...'
  await sql`alter table users add column if not exists role text default null`;
  await sql`alter table users add column if not exists roles text[] not null default '{}'`;
  await sql`update users set roles = array[role] where role is not null and role <> '' and roles = '{}'`;
  await sql`alter table users drop column if exists role`;
  // Ручная скидка на конкретное КП
  await sql`alter table cart_exports add column if not exists discount_percent int not null default 0`;
  slidesMigrated = true;
}

export const handle: Handle = async ({ event, resolve }) => {
  ensureSlidesTable().catch((e) => console.error('Migration error:', e));
  const token = event.cookies.get(SESSION_COOKIE);
  if (!token) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }
  const { user, session } = await validateSessionToken(token);
  if (!user || !session) deleteSessionCookie(event.cookies);
  event.locals.user = user;
  event.locals.session = session;
  return resolve(event);
	
};
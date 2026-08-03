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
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { hasRole } from '$lib/server/auth';

// Счётчик непрочитанных сообщений чата — для значка профиля у оператора.
export const GET: RequestHandler = async ({ locals }) => {
  const user = locals.user;
  if (!user || !(hasRole(user, 'operator') || hasRole(user, 'admin'))) {
    return json({ unread: 0 }, { status: 403 });
  }
  const rows = await sql`
    SELECT COALESCE(SUM(unread), 0) AS total
    FROM chat_threads
    WHERE status = 'open'
  `;
  return json({ unread: Number(rows[0]?.total ?? 0) });
};

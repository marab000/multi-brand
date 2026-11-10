import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';

// Polling клиента: новые сообщения треда после afterId + статус треда.
// Лёгкий GET — дергается раз в 3-4с пока панель чата открыта.
export const GET: RequestHandler = async ({ url }) => {
  const threadId = url.searchParams.get('threadId') ?? '';
  const after = Number(url.searchParams.get('after') ?? 0);

  if (!threadId) return json({ messages: [], status: 'missing' });

  const rows = await sql`
    SELECT id, sender, text, created_at
    FROM chat_messages
    WHERE thread_id = ${threadId} AND id > ${after}
    ORDER BY id ASC
  `;
  const thread = await sql`
    SELECT status FROM chat_threads WHERE id = ${threadId}
  `;

  return json({
    messages: rows.map((r) => ({
      id: Number(r.id),
      sender: r.sender,
      text: r.text,
      at: r.created_at
    })),
    status: thread[0]?.status ?? 'missing'
  });
};

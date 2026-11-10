import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { getChatConfig } from '$lib/server/chatConfig';
import { sendChatNotifyEmail } from '$lib/server/email';

// Антиспам: не чаще одного сообщения в 1.5с на тред (в памяти процесса —
// для v1 с 1-2 диалогами достаточно; рестарт сбрасывает — не критично).
const lastSend = new Map<string, number>();

export const POST: RequestHandler = async ({ request }) => {
  const config = await getChatConfig();
  if (!config.enabled) {
    return json({ error: 'chat disabled' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    threadId?: string;
    text?: string;
  } | null;

  const text = (body?.text ?? '').toString().trim();
  const threadId = (body?.threadId ?? '').toString().trim();

  if (!text) return json({ error: 'empty message' }, { status: 400 });
  if (text.length > config.maxLen) {
    return json({ error: 'message too long' }, { status: 400 });
  }

  let id = threadId;
  let isNew = false;

  if (id) {
    const exists = await sql`
      SELECT id, status FROM chat_threads WHERE id = ${id}
    `;
    if (!exists.length) {
      // тред потерян клиентом (чистили localStorage/БД) — начнём новый
      id = '';
    }
    const prev = lastSend.get(id || threadId) ?? 0;
    if (Date.now() - prev < 1500) {
      return json({ error: 'too fast' }, { status: 429 });
    }
    // завершённый диалог возобновляется: снова станет непрочитанным (ниже общий инкремент)
    if (exists[0]?.status === 'closed') {
      await sql`UPDATE chat_threads SET status = 'open' WHERE id = ${id}`;
    }
  }

  if (!id) {
    id = crypto.randomUUID();
    isNew = true;
    await sql`INSERT INTO chat_threads (id) VALUES (${id})`;
    // письмо только при создании диалога, чтобы не спамить на каждое сообщение;
    // notifyEmail зашит пустым — уведомления выключены
    if (config.notifyEmail) {
      sendChatNotifyEmail(config.notifyEmail, { text, threadId: id }).catch(() => {});
    }
  }

  lastSend.set(id, Date.now());

  await sql`
    INSERT INTO chat_messages (thread_id, sender, text)
    VALUES (${id}, 'client', ${text})
  `;
  await sql`
    UPDATE chat_threads SET updated_at = now(), unread = unread + 1 WHERE id = ${id}
  `;

  return json({ threadId: id, isNew });
};

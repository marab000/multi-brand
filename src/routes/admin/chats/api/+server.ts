import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { hasRole } from '$lib/server/auth';
import { getChatConfig } from '$lib/server/chatConfig';

// Единая точка чат-админки. Guard: admin или operator.
const guard = ({ locals }: { locals: App.Locals }) => {
  const user = locals.user;
  return !!user && (hasRole(user, 'admin') || hasRole(user, 'operator'));
};

// GET: без threadId — список диалогов; с threadId+after — новые сообщения треда.
export const GET: RequestHandler = async (event) => {
  if (!guard(event)) return json({ error: 'forbidden' }, { status: 403 });

  const threadId = event.url.searchParams.get('threadId');
  const after = Number(event.url.searchParams.get('after') ?? 0);
  // серверный поиск: q — подстрока по имени/телефону/текстам/номеру диалога
  const q = (event.url.searchParams.get('q') ?? '').toString().trim();
  // постраничная пагинация: открытые сверху, завершённые падают вниз
  const page = Math.max(1, Number(event.url.searchParams.get('page') ?? 1));
  const per = Math.min(50, Math.max(5, Number(event.url.searchParams.get('per') ?? 10)));
  const offset = (page - 1) * per;

  const { autoCloseHours } = await getChatConfig();

  // ленивое автозакрытие неактивных: X ч тишины после ответа оператора
  // (закрытые остаются в списке блеклыми «завершёнными»)
  if (autoCloseHours > 0) {
    await sql`
      UPDATE chat_threads t SET status = 'closed', unread = 0
      WHERE t.status = 'open'
        AND EXISTS (
          SELECT 1 FROM chat_messages m
          WHERE m.thread_id = t.id AND m.sender = 'operator'
            AND m.id = (SELECT MAX(id) FROM chat_messages WHERE thread_id = t.id)
        )
        AND t.updated_at < now() - make_interval(hours => ${autoCloseHours})
    `;
  }

  if (threadId) {
    const messages = await sql`
      SELECT id, sender, text, created_at
      FROM chat_messages
      WHERE thread_id = ${threadId} AND id > ${after}
      ORDER BY id ASC
    `;
    const thread = await sql`
      SELECT status FROM chat_threads WHERE id = ${threadId}
    `;
    return json({
      messages: messages.map((m) => ({
        id: Number(m.id),
        sender: m.sender,
        text: m.text,
        at: m.created_at
      })),
      status: thread[0]?.status ?? 'missing'
    });
  }

  const pattern = `%${q}%`;
  const threads = await sql`
    SELECT t.id, t.seq, t.status, t.unread, t.updated_at,
      t.client_name, t.client_phone,
      lm.text AS last_text, lm.sender AS last_sender,
      cf.text AS first_text,
      count(*) OVER () AS total
    FROM chat_threads t
    LEFT JOIN LATERAL (
      SELECT text, sender FROM chat_messages WHERE thread_id = t.id ORDER BY id DESC LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT text FROM chat_messages WHERE thread_id = t.id AND sender = 'client' ORDER BY id ASC LIMIT 1
    ) cf ON true
    WHERE (
      ${q} = ''
      OR t.client_name ILIKE ${pattern}
      OR t.client_phone ILIKE ${pattern}
      OR t.seq::text ILIKE ${pattern}
      OR lm.text ILIKE ${pattern}
      OR cf.text ILIKE ${pattern}
    )
    ORDER BY (t.status = 'open') DESC, t.updated_at DESC
    LIMIT ${per} OFFSET ${offset}
  `;
  const total = threads[0]?.total ? Number(threads[0].total) : 0;

  return json({
    page,
    pages: Math.max(1, Math.ceil(total / per)),
    total,
    threads: threads.map((t) => ({
      id: t.id,
      seq: Number(t.seq),
      status: t.status,
      unread: Number(t.unread),
      updatedAt: t.updated_at,
      clientName: t.client_name ?? null,
      clientPhone: t.client_phone ?? null,
      lastText: t.last_text ?? null,
      lastSender: t.last_sender ?? null,
      firstText: t.first_text ?? null
    }))
  });
};

// POST: действия менеджера.
export const POST: RequestHandler = async (event) => {
  if (!guard(event)) return json({ error: 'forbidden' }, { status: 403 });

  const body = (await event.request.json().catch(() => null)) as {
    action?: 'reply' | 'close' | 'read' | 'contacts' | 'edit';
    threadId?: string;
    text?: string;
    messageId?: number;
    clientName?: string;
    clientPhone?: string;
  } | null;

  const threadId = (body?.threadId ?? '').toString().trim();
  if (!threadId) return json({ error: 'no threadId' }, { status: 400 });

  const action = body?.action;

  if (action === 'reply') {
    const text = (body?.text ?? '').toString().trim();
    if (!text) return json({ error: 'empty message' }, { status: 400 });
    if (text.length > 2000) return json({ error: 'message too long' }, { status: 400 });

    const inserted = await sql`
      INSERT INTO chat_messages (thread_id, sender, text)
      VALUES (${threadId}, 'operator', ${text})
      RETURNING id, created_at
    `;
    // ответ менеджера = тред прочитан и поднят наверх
    await sql`
      UPDATE chat_threads SET updated_at = now(), unread = 0 WHERE id = ${threadId}
    `;
    const m = inserted[0];
    return json({ ok: true, message: { id: Number(m.id), sender: 'operator', text, at: m.created_at } });
  }

  if (action === 'close') {
    await sql`
      UPDATE chat_threads SET status = 'closed', unread = 0 WHERE id = ${threadId}
    `;
    return json({ ok: true });
  }

  if (action === 'read') {
    await sql`UPDATE chat_threads SET unread = 0 WHERE id = ${threadId}`;
    return json({ ok: true });
  }

  // правка своего сообщения оператором: только свои, текст не пустой
  if (action === 'edit') {
    const messageId = Number(body?.messageId ?? 0);
    const text = (body?.text ?? '').toString().trim();
    if (!messageId || !text) return json({ error: 'no message' }, { status: 400 });
    if (text.length > 2000) return json({ error: 'message too long' }, { status: 400 });
    const updated = await sql`
      UPDATE chat_messages SET text = ${text}
      WHERE id = ${messageId} AND sender = 'operator'
      RETURNING id, text
    `;
    if (!updated.length) return json({ error: 'not found' }, { status: 404 });
    return json({ ok: true, message: { id: Number(updated[0].id), text: updated[0].text } });
  }

  if (action === 'contacts') {
    const name = (body?.clientName ?? '').toString().trim();
    const phone = (body?.clientPhone ?? '').toString().trim();
    await sql`
      UPDATE chat_threads SET client_name = ${name}, client_phone = ${phone} WHERE id = ${threadId}
    `;
    return json({ ok: true, clientName: name, clientPhone: phone });
  }

  return json({ error: 'unknown action' }, { status: 400 });
};

import { json } from '@sveltejs/kit';
import { sendLeadEmail } from '$lib/server/email';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const phone = String(body?.phone ?? '').trim();
  const message = String(body?.message ?? '').trim();
  if (!name || !phone) return json({ message: 'Некорректные данные заявки' }, { status: 400 });
  try {
    await sendLeadEmail({ name, phone, message });
  } catch (e) {
    console.error('Lead email error:', e);
    return json({ message: 'Не удалось отправить заявку' }, { status: 500 });
  }
  return json({ ok: true });
};

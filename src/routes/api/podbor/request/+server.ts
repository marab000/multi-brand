import { json } from '@sveltejs/kit';
import { sendLeadEmail } from '$lib/server/email';
import type { RequestHandler } from './$types';

// POST — заявка из конструктора «Собери комплект техники»:
// расчёт комплекта с бонусами уходит на почту магазина.
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    const phone = String(body?.phone ?? '').trim();
    if (name.length < 2 || phone.replace(/\D/g, '').length < 10) {
      return json({ error: 'Укажите имя и телефон' }, { status: 400 });
    }

    const items: { name: string; price: number; bonus: number }[] = Array.isArray(body?.items)
      ? body.items.slice(0, 20)
      : [];
    const total = Number(body?.total) || 0;
    const bonusTotal = Number(body?.bonusTotal) || 0;

    const lines = items.map(
      (i) => `• ${i.name} — ${Math.round(i.price).toLocaleString('ru-RU')} ₽ (баллы +${Math.round(i.bonus).toLocaleString('ru-RU')} ₽)`
    );
    const message = [
      'Комплект из конструктора:',
      ...lines,
      `Итого: ${Math.round(total).toLocaleString('ru-RU')} ₽`,
      `Общая выгода (баллы): ${Math.round(bonusTotal).toLocaleString('ru-RU')} ₽`
    ].join('\n');

    await sendLeadEmail({ name, phone, message });
    return json({ ok: true });
  } catch {
    return json({ error: 'Не удалось отправить заявку' }, { status: 500 });
  }
};

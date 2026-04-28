import { fail } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return { user: locals.user };
};

export const actions: Actions = {
  update: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: 'Нужно войти' });
    const form = await request.formData();
    const fullName = String(form.get('fullName') ?? '').trim();
    const phoneRaw = String(form.get('phone') ?? '').trim();
    if (!fullName) return fail(400, { message: 'Введите имя' });
    if (phoneRaw && !isValidRuPhone(phoneRaw))
      return fail(400, { message: 'Введите корректный номер телефона' });
    const phone = phoneRaw ? normalizeRuPhone(phoneRaw) : null;
    const rows = await sql`
      update users
      set full_name = ${fullName}, phone = ${phone}
      where id = ${locals.user.id}
      returning id, email, phone, full_name, email_verified
    `;
    return { success: true, user: rows[0] };
  }
};

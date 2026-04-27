import { fail } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return { user: locals.user };
};

export const actions: Actions = {
  update: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: 'Нужно войти' });
    const form = await request.formData();
    const fullName = String(form.get('fullName') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    if (!fullName) return fail(400, { message: 'Введите имя' });
    await sql`
      update users
      set full_name = ${fullName}, phone = ${phone || null}
      where id = ${locals.user.id}
    `;
    return { success: true };
  }
};
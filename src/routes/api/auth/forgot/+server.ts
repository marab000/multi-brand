import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPasswordReset } from '$lib/server/auth';
import { sendPasswordResetEmail } from '$lib/server/email';
import { SITE_URL } from '$lib/config/site';

// Ответ всегда 200 (даже если почты нет в базе) — не раскрываем, кто зарегистрирован
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const email = String(body?.email ?? '').trim();
	if (!email || !email.includes('@')) return json({ message: 'Введи корректную почту' }, { status: 400 });

	const token = await createPasswordReset(email);
	if (token) {
		await sendPasswordResetEmail(email, `${SITE_URL}/reset-password?token=${token}`);
	}
	return json({ message: 'Если почта зарегистрирована, письмо со сбросом уже отправлено' });
};

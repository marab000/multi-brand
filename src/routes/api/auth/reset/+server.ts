import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { consumePasswordReset } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const token = String(body?.token ?? '');
	const password = String(body?.password ?? '');
	if (!token) return json({ message: 'Ссылка недействительна' }, { status: 400 });
	if (password.length < 6) return json({ message: 'Пароль — минимум 6 символов' }, { status: 400 });

	const ok = await consumePasswordReset(token, password);
	if (!ok) return json({ message: 'Ссылка недействительна или устарела. Запроси сброс заново' }, { status: 400 });

	return json({ message: 'Пароль изменён — войди с новым паролем' });
};

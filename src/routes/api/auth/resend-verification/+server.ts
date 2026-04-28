import { json } from '@sveltejs/kit';
import { createEmailVerificationToken } from '$lib/server/emailVerification';
import { sendVerificationEmail } from '$lib/server/email';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Нужно войти' }, { status: 401 });
  if (user.email_verified) return json({ message: 'Почта уже подтверждена' }, { status: 400 });

  const { token } = await createEmailVerificationToken(user.id);

  const baseUrl = new URL(request.url).origin;
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  await sendVerificationEmail(user.email, verifyUrl);

  return json({ ok: true });
};

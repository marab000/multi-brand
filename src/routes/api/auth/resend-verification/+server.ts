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

  try {
    await sendVerificationEmail(user.email, verifyUrl);
  } catch (err) {
    console.error('[resend-verification] письмо не отправлено:', err);
    return json(
      { message: 'Не удалось отправить письмо. Попробуйте позже или позвоните нам.' },
      { status: 502 }
    );
  }

  return json({ ok: true });
};

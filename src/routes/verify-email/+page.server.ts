import { sql } from '$lib/db';
import { hashEmailToken } from '$lib/server/emailVerification';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const sent = url.searchParams.get('sent');
  if (sent) {
    return {
      status: 'sent',
      title: 'Проверьте почту',
      message:
        'Мы отправили письмо со ссылкой для подтверждения. Перейдите по ссылке из письма, чтобы активировать аккаунт.'
    };
  }

  const token = url.searchParams.get('token');
  if (!token) {
    return {
      status: 'error',
      title: 'Ссылка не найдена',
      message: 'Токен подтверждения отсутствует.'
    };
  }

  const tokenHash = hashEmailToken(token);
  const rows = await sql`
    select id, user_id, expires_at
    from email_verification_tokens
    where token_hash = ${tokenHash}
    limit 1
  `;
  const row = rows[0];

  if (!row) {
    return {
      status: 'error',
      title: 'Ссылка недействительна',
      message: 'Возможно, почта уже подтверждена или ссылка устарела.'
    };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await sql`delete from email_verification_tokens where id = ${row.id}`;
    return {
      status: 'error',
      title: 'Ссылка устарела',
      message: 'Запросите новое письмо для подтверждения в личном кабинете.'
    };
  }

  await sql`update users set email_verified = true where id = ${row.user_id}`;
  await sql`delete from email_verification_tokens where id = ${row.id}`;

  return {
    status: 'success',
    title: 'Почта подтверждена',
    message: 'Аккаунт активирован. Теперь вы можете полноценно пользоваться личным кабинетом.'
  };
};

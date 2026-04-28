import { sql } from '$lib/db';
import crypto from 'node:crypto';

const TOKEN_HOURS = 24;

export function createEmailToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashEmailToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createEmailVerificationToken(userId: number) {
  const token = createEmailToken();
  const tokenHash = hashEmailToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000);
  await sql`delete from email_verification_tokens where user_id = ${userId}`;
  await sql`
    insert into email_verification_tokens (user_id, token_hash, expires_at)
    values (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt };
}

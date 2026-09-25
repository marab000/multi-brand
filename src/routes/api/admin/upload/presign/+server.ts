import { json, error } from '@sveltejs/kit';
import { checkAdmin } from '$lib/server/adminAuth';
import { presignUpload } from '$lib/server/s3';
import type { RequestHandler } from './$types';

// POST — presigned PUT-ссылка для прямой загрузки тяжёлого файла (видео) в S3.
// Тело запроса не проходит через наш сервер, поэтому лимит BODY_SIZE_LIMIT не мешает.
const ALLOWED = new Map([
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
  ['video/quicktime', 'mov']
]);

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);

  const body = await request.json().catch(() => null);
  const contentType = String(body?.contentType ?? '');
  if (!ALLOWED.has(contentType)) {
    throw error(400, 'Поддерживаются только видео MP4, WebM и MOV');
  }

  const key = `articles/video-${Date.now()}.${ALLOWED.get(contentType)}`;
  const { uploadUrl, publicUrl } = await presignUpload(key, contentType);
  return json({ uploadUrl, publicUrl, key });
};

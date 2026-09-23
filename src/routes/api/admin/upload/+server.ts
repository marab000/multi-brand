import { json, error } from '@sveltejs/kit';
import { checkAdmin } from '$lib/server/adminAuth';
import { uploadWebpImage } from '$lib/server/s3';
import sharp from 'sharp';
import type { RequestHandler } from './$types';

// POST — универсальная загрузка картинки (multipart: file)
// Используется для обложек статей и image-блоков
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  await checkAdmin(cookies, locals);

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw error(400, 'Файл не передан');

  const buffer = Buffer.from(await file.arrayBuffer());

  // Валидируем что это читаемое изображение
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) throw new Error('bad image');
  } catch {
    throw error(400, 'Не удалось прочитать изображение. Поддерживаются JPG, PNG, WebP.');
  }

  const key = `articles/img-${Date.now()}.webp`;
  const url = await uploadWebpImage(buffer, key, 1600);

  return json({ url });
};

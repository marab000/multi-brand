import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { uploadWebpImage, deleteImage } from '$lib/server/s3';
import sharp from 'sharp';
import type { RequestHandler } from './$types';

const COOKIE = 'admin_session';

async function checkAdmin(cookies: any) {
  const session = cookies.get(COOKIE);
  if (!session) throw error(401, 'Unauthorized');
  const users = await sql`SELECT id FROM admin_users WHERE id=${Number(session)}`;
  if (!users.length) throw error(401, 'Unauthorized');
}

// Проверка aspect ratio
// desktop: широкий, ~3:1 (от 2.5:1 до 4:1)
// mobile: ~4:3 или ~3:4 (от 0.65 до 1.6)
function validateAspectRatio(
  buffer: Buffer,
  type: 'desktop' | 'mobile'
): Promise<{ ok: boolean; message: string }> {
  return sharp(buffer)
    .metadata()
    .then((meta) => {
      if (!meta.width || !meta.height) {
        return { ok: false, message: 'Не удалось определить размеры изображения' };
      }
      const ratio = meta.width / meta.height;
      if (type === 'desktop') {
        // допускаем от 1.8 (2:1) до 4.5 — широкий баннер
        if (ratio < 1.8 || ratio > 4.5) {
          return {
            ok: false,
            message: `Десктопное изображение должно быть широким баннером (от 2:1 до 4:1). У вас ${meta.width}×${meta.height} (${ratio.toFixed(1)}:1)`
          };
        }
      } else {
        // mobile: от 0.65 (вертикальное ~3:4) до 1.6 (горизонтальное ~4:3)
        if (ratio < 0.65 || ratio > 1.6) {
          return {
            ok: false,
            message: `Мобильное изображение должно быть примерно 4:3 или 9:16. У вас ${meta.width}×${meta.height} (${ratio.toFixed(1)}:1)`
          };
        }
      }
      return { ok: true, message: '' };
    })
    .catch(() => ({ ok: false, message: 'Не удалось прочитать изображение' }));
}

// GET — все слайды для админки (включая неактивные)
export const GET: RequestHandler = async ({ cookies }) => {
  await checkAdmin(cookies);
  const slides = await sql`
    SELECT id, desktop_url, mobile_url, position, is_active, created_at
    FROM slides ORDER BY position ASC, id ASC
  `;
  return json(slides);
};

// POST — загрузка нового слайда (multipart: desktop + mobile файлы)
export const POST: RequestHandler = async ({ request, cookies }) => {
  await checkAdmin(cookies);

  const formData = await request.formData();
  const desktop = formData.get('desktop') as File | null;
  const mobile = formData.get('mobile') as File | null;

  if (!desktop || !mobile) {
    throw error(400, 'Нужно загрузить оба изображения (desktop и mobile)');
  }

  const desktopBuffer = Buffer.from(await desktop.arrayBuffer());
  const mobileBuffer = Buffer.from(await mobile.arrayBuffer());

  // Проверка aspect ratio (тут же валидируется что файл читается)
  const desktopCheck = await validateAspectRatio(desktopBuffer, 'desktop');
  if (!desktopCheck.ok) throw error(400, `Десктоп: ${desktopCheck.message}`);

  const mobileCheck = await validateAspectRatio(mobileBuffer, 'mobile');
  if (!mobileCheck.ok) throw error(400, `Мобильная: ${mobileCheck.message}`);

  let desktopUrl: string, mobileUrl: string;
  try {
    desktopUrl = await uploadWebpImage(desktopBuffer, `slides/desktop-${Date.now()}.webp`, 1920);
    mobileUrl = await uploadWebpImage(mobileBuffer, `slides/mobile-${Date.now()}.webp`, 800);
  } catch (e: any) {
    console.error('Slide upload error:', e);
    throw error(400, 'Не удалось обработать изображение. Поддерживаются JPG, PNG, WebP. Если это фото с iPhone (HEIC) — конвертируйте в JPG.');
  }

  // position = max + 1
  const maxPos = await sql`SELECT COALESCE(MAX(position), -1) as max_pos FROM slides`;
  const nextPos = (maxPos[0]?.max_pos ?? -1) + 1;

  const result = await sql`
    INSERT INTO slides (desktop_url, mobile_url, position)
    VALUES (${desktopUrl}, ${mobileUrl}, ${nextPos})
    RETURNING id, desktop_url, mobile_url, position, is_active, created_at
  `;

  return json(result[0]);
};

// PATCH — обновление position / is_active
export const PATCH: RequestHandler = async ({ request, cookies }) => {
  await checkAdmin(cookies);

  const body = await request.json();
  const { id, position, is_active } = body;

  if (typeof id !== 'number') throw error(400, 'ID required');

  const updates: string[] = [];
  const values: any[] = [];

  if (typeof position === 'number') {
    updates.push(`position = $${values.length + 1}`);
    values.push(position);
  }
  if (typeof is_active === 'boolean') {
    updates.push(`is_active = $${values.length + 1}`);
    values.push(is_active);
  }

  if (!updates.length) throw error(400, 'Nothing to update');

  values.push(id);
  const result = await sql.unsafe(
    `UPDATE slides SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, desktop_url, mobile_url, position, is_active`,
    values
  );

  return json(result[0]);
};

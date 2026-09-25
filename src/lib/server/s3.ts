import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET } from '$env/static/private';

const client = new S3Client({
  region: 'reg',
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY
  },
  forcePathStyle: true
});

const PUBLIC_PREFIX = `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET}/`;

export async function uploadImage(buffer: Buffer, key: string, contentType = 'image/webp'): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ACL: 'public-read',
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
  return `${PUBLIC_PREFIX}${key}`;
}

/**
 * Конвертирует изображение в webp и загружает на S3.
 * @param buffer - исходный файл (jpg/png/webp)
 * @param key - путь в бакете, например 'slides/desktop-1.webp'
 * @param maxWidth - максимальная ширина (по умолчанию 1920)
 * @returns публичный URL загруженного файла
 */
export async function uploadWebpImage(
  buffer: Buffer,
  key: string,
  maxWidth = 1920
): Promise<string> {
  const webpBuffer = await sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  return uploadImage(webpBuffer, key, 'image/webp');
}

/**
 * Presigned PUT-ссылка: браузер льёт файл в S3 напрямую, минуя лимит тела запроса.
 * Нужна для тяжёлых файлов (видео), которые не провести через наш сервер.
 */
export async function presignUpload(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: 'public-read'
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
  return { uploadUrl, publicUrl: `${PUBLIC_PREFIX}${key}` };
}

export async function deleteImage(url: string): Promise<void> {
  // Извлекаем ключ из полного URL
  const key = url.replace(PUBLIC_PREFIX, '');
  if (!key || key === url) return;
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
      })
    );
  } catch (e) {
    console.error('S3 delete error:', e);
  }
}

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const ALLOWED_HOSTS = ['s3.regru.cloud'];

export const GET: RequestHandler = async ({ url, fetch }) => {
  const src = url.searchParams.get('url');
  if (!src) throw error(400, 'Missing url');
  let imageUrl: URL;
  try {
    imageUrl = new URL(src);
  } catch {
    throw error(400, 'Invalid url');
  }
  if (!ALLOWED_HOSTS.includes(imageUrl.hostname)) throw error(403, 'Forbidden host');
  const response = await fetch(imageUrl.toString());
  if (!response.ok) throw error(502, 'Image fetch failed');
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw error(415, 'Unsupported content type');
  const buffer = Buffer.from(await response.arrayBuffer());
  return json({ dataUrl: `data:${contentType};base64,${buffer.toString('base64')}` });
};
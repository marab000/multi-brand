import { json } from '@sveltejs/kit';
import { sendLeadEmail } from '$lib/server/email';
import type { RequestHandler } from './$types';

// Лимит вложения: больше 10 МБ письмо не утащит — отдаём 400 клиенту
const MAX_FILE_BYTES = 10 * 1024 * 1024;
// Белый список расширений плана кухни / дизайн-проекта
const FILE_RE = /\.(pdf|docx?|png|jpe?g|webp)$/i;

export const POST: RequestHandler = async ({ request }) => {
  const contentType = request.headers.get('content-type') ?? '';
  let name: string;
  let phone: string;
  let message: string;
  let source: string;
  let attachment: { filename: string; content: string } | null = null;

  if (contentType.includes('multipart/form-data')) {
    // заявка с файлом (план кухни из модалки «Написать эксперту»)
    const form = await request.formData().catch(() => null);
    if (!form) return json({ message: 'Некорректные данные заявки' }, { status: 400 });
    name = String(form.get('name') ?? '').trim();
    phone = String(form.get('phone') ?? '').trim();
    message = String(form.get('message') ?? '').trim();
    source = String(form.get('source') ?? '').trim();
    const file = form.get('file');
    if (file && typeof file === 'object' && 'arrayBuffer' in file && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        return json({ message: 'Файл больше 10 МБ — пришлите его в мессенджер' }, { status: 400 });
      }
      if (!FILE_RE.test(file.name)) {
        return json({ message: 'Поддерживаются PDF, DOC, PNG, JPG, WEBP' }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      attachment = { filename: file.name, content: buf.toString('base64') };
    }
  } else {
    const body = await request.json().catch(() => null);
    name = String(body?.name ?? '').trim();
    phone = String(body?.phone ?? '').trim();
    message = String(body?.message ?? '').trim();
    // источник заявки (kit-fix, quiz и т.д.); отсутствие — основной сайт
    source = String(body?.source ?? '').trim();
  }

  if (!name || !phone) return json({ message: 'Некорректные данные заявки' }, { status: 400 });
  try {
    await sendLeadEmail({
      name,
      phone,
      message,
      source,
      ...(attachment ? { attachment } : {})
    });
  } catch (e) {
    console.error('Lead email error:', e);
    return json({ message: 'Не удалось отправить заявку' }, { status: 500 });
  }
  return json({ ok: true });
};

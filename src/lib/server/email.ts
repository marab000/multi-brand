import { RESEND_API_KEY, RESEND_FROM_EMAIL } from '$env/static/private';
import {
  ORDER_NOTIFY_EMAIL,
  SITE_EMAIL,
  SITE_LOGO_URL,
  SITE_NAME,
  SITE_PHONE,
  SITE_URL,
  SITE_URL_NAME
} from '$lib/config/site';
import { formatPrice } from '$lib/utils/formatPrice';
import { Resend } from 'resend';

const resend = new Resend(RESEND_API_KEY);

const money = (value: number | null | undefined) => `${formatPrice(value)} ₽`;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendVerificationEmail(email: string, url: string) {
  const res = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: email,
    subject: `Подтверждение почты ${SITE_NAME}`,
    html: `
      <!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Подтверждение почты</title>
        </head>
        <body style="margin:0;padding:0;background:#f5f6f7;font-family:Arial,Helvetica,sans-serif;color:#202020;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6f7;padding:28px 14px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eeeeee;">
                  <tr>
                    <td style="padding:28px 30px 18px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="left">
                            <a href="${SITE_URL}" target="_blank" style="text-decoration:none;">
                              <img src="${SITE_LOGO_URL}" width="166" alt="${SITE_NAME}" style="display:block;width:166px;max-width:166px;height:auto;border:0;" />
                            </a>
                          </td>
                          <td align="right" style="font-size:15px;font-weight:700;color:#202020;white-space:nowrap;">${SITE_PHONE}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 30px 8px;">
                      <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;color:#202020;">Подтвердите почту</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 30px 0;">
                      <p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#333333;">Здравствуйте!</p>
                      <p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:#333333;">Вы зарегистрировались на сайте ${SITE_NAME}. Чтобы завершить регистрацию и активировать личный кабинет, нажмите кнопку ниже.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 30px 28px;">
                      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 22px;background:#3e6f4f;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;">Подтвердить почту</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 30px 26px;"><div style="height:1px;background:#eeeeee;"></div></td>
                  </tr>
                  <tr>
                    <td style="padding:0 30px 12px;">
                      <p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#666666;">Если кнопка не работает, скопируйте ссылку и откройте её в браузере:</p>
                      <p style="margin:0;font-size:13px;line-height:1.45;word-break:break-all;"><a href="${url}" target="_blank" style="color:#2b61d1;text-decoration:underline;">${url}</a></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 30px 30px;">
                      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#777777;">Если вы не регистрировались на сайте ${SITE_URL_NAME}, просто проигнорируйте это письмо.</p>
                      <p style="margin:0;font-size:14px;line-height:1.55;color:#333333;">С уважением,<br />Команда ${SITE_NAME}</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;">
                  <tr>
                    <td align="center" style="padding:18px 20px 0;font-size:12px;line-height:1.45;color:#999999;">
                      ${SITE_NAME} · ${SITE_PHONE} · <a href="mailto:${ORDER_NOTIFY_EMAIL}" style="color:#999999;text-decoration:underline;">${ORDER_NOTIFY_EMAIL}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `
  });
  if (res.error) throw res.error;
  return res;
}

export async function sendNewOrderEmail(order: {
  id?: number | string;
  name: string;
  phone: string;
  total: number;
  items: { id: string; name: string; price: number; qty: number }[];
}) {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eeeeee;color:#202020;font-size:14px;">${escapeHtml(item.name)}</td>
          <td align="center" style="padding:12px;border-bottom:1px solid #eeeeee;color:#555555;font-size:14px;white-space:nowrap;">${item.qty}</td>
          <td align="right" style="padding:12px;border-bottom:1px solid #eeeeee;color:#555555;font-size:14px;white-space:nowrap;">${money(item.price)}</td>
          <td align="right" style="padding:12px;border-bottom:1px solid #eeeeee;color:#202020;font-size:14px;font-weight:700;white-space:nowrap;">${money(item.price * item.qty)}</td>
        </tr>
      `
    )
    .join('');
  const res = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: ORDER_NOTIFY_EMAIL,
    subject: `Новый заказ${order.id ? ` #${order.id}` : ''}`,
    html: `
      <!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Новый заказ</title>
        </head>
        <body style="margin:0;padding:0;background:#f5f6f7;font-family:Arial,Helvetica,sans-serif;color:#202020;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6f7;padding:28px 14px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eeeeee;">
                  <tr>
                    <td style="padding:28px 30px 18px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="left">
                            <a href="${SITE_URL}" target="_blank" style="text-decoration:none;">
                              <img src="${SITE_LOGO_URL}" width="166" alt="${SITE_NAME}" style="display:block;width:166px;max-width:166px;height:auto;border:0;" />
                            </a>
                          </td>
                          <td align="right" style="font-size:15px;font-weight:700;color:#202020;white-space:nowrap;">${SITE_PHONE}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 30px 8px;">
                      <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;color:#202020;">Новый заказ${order.id ? ` #${order.id}` : ''}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 30px 18px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f8f8;border-radius:14px;">
                        <tr>
                          <td style="padding:16px 18px;font-size:15px;line-height:1.6;color:#333333;">
                            <div><b>Имя:</b> ${escapeHtml(order.name)}</div>
                            <div><b>Телефон:</b> <a href="tel:${order.phone}" style="color:#202020;text-decoration:none;">${escapeHtml(order.phone)}</a></div>
                            <div><b>Сумма:</b> ${money(order.total)}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 30px 30px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #eeeeee;border-radius:12px;overflow:hidden;">
                        <thead>
                          <tr style="background:#f3f3f3;">
                            <th align="left" style="padding:12px;border-bottom:1px solid #dddddd;color:#202020;font-size:13px;">Товар</th>
                            <th align="center" style="padding:12px;border-bottom:1px solid #dddddd;color:#202020;font-size:13px;">Кол-во</th>
                            <th align="right" style="padding:12px;border-bottom:1px solid #dddddd;color:#202020;font-size:13px;">Цена</th>
                            <th align="right" style="padding:12px;border-bottom:1px solid #dddddd;color:#202020;font-size:13px;">Сумма</th>
                          </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                      </table>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;">
                  <tr>
                    <td align="center" style="padding:18px 20px 0;font-size:12px;line-height:1.45;color:#999999;">
                      ${SITE_NAME} · ${SITE_PHONE} · <a href="mailto:${SITE_EMAIL}" style="color:#999999;text-decoration:underline;">${SITE_EMAIL}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `
  });
  if (res.error) throw res.error;
  return res;
}

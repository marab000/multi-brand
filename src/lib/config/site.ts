export const SITE_NAME = 'MultiBrand';
export const SITE_URL = 'https://multi-brand.online';
export const SITE_URL_NAME = 'multi-brand.online';

// Рабочий/юридический ящик компании. Написание — как TETRAIS_LOGIN в .env
// (гит-история подтверждает: только этот адрес, gmail-вариантов не было).
// Футер, оферта (/offer), политика ПДн (/privacy), шапка PDF КП и дефолт
// notifyEmail чата ссылаются на эту константу — литерал в коде один.
export const COMPANY_EMAIL = 'multibrend2005@yandex.ru';

// Контакты по умолчанию. Живые значения лежат в settings.site_contacts и
// правятся в админке (Tetrasis API → карточка «Контакты»); эти — фолбэк,
// если записи в базе ещё нет. Меняем цифры/ссылки здесь — только при деплое.
export const DEFAULT_CONTACTS = {
  phoneDigits: '88001019771',
  tgLink: 'https://t.me/+79375777751',
  maxLink: 'https://max.ru/u/f9LHodD0cOJd3pqJtE3zs9SRYVMfnhHoWJKEYKq253D7DVbb1oMkXOZxb5g',
  pavelName: 'Павел',
  pavelPhone: '+79276707817',
  // ящик заявок: сюда падают заказы/лиды (ORDER_NOTIFY_EMAIL), правится в админке
  email: 'mebeliyer@gmail.com',
  // ящик в футере — тот же рабочий ящик компании, НЕ ящик заявок
  footerEmail: COMPANY_EMAIL
};

// Единый источник номера (с восьмёркой, без плюса): из него выводятся
// и отображаемый формат, и ссылка tel:
export const SITE_PHONE_HREF = `+7${DEFAULT_CONTACTS.phoneDigits.slice(1)}`;
export const SITE_PHONE = `${DEFAULT_CONTACTS.phoneDigits.slice(0, 1)}(${DEFAULT_CONTACTS.phoneDigits.slice(1, 4)})${DEFAULT_CONTACTS.phoneDigits.slice(4, 7)}-${DEFAULT_CONTACTS.phoneDigits.slice(7, 9)}-${DEFAULT_CONTACTS.phoneDigits.slice(9)}`;
export const SITE_EMAIL = DEFAULT_CONTACTS.email;
export const FOOTER_EMAIL = DEFAULT_CONTACTS.footerEmail;
export const LINK_TG = DEFAULT_CONTACTS.tgLink;
export const LINK_MAX = DEFAULT_CONTACTS.maxLink;
// WhatsApp менеджера Павла (wa.me — номер без плюса и разделителей)
export const LINK_WHATSAPP = `https://wa.me/${DEFAULT_CONTACTS.pavelPhone.replace(/\D/g, '')}`;
export const SITE_LOGO_URL = `${SITE_URL}/images/logo-email.png`;
export const ORDER_NOTIFY_EMAIL = DEFAULT_CONTACTS.email;

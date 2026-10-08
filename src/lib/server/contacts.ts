import { sql } from '$lib/db';
import { DEFAULT_CONTACTS } from '$lib/config/site';

// Контакты сайта: живые значения в settings.site_contacts (правятся в админке),
// фолбэк — DEFAULT_CONTACTS из конфига. Формат телефона выводится из цифр.

export type Contacts = {
	phoneDigits: string;
	phone: string;
	phoneHref: string;
	tgLink: string;
	maxLink: string;
	pavelName: string;
	pavelPhone: string;
	pavelPhoneHref: string;
	email: string;
};

// tel:-ссылка из любого формата ввода: 8..., 7..., +7..., 10 цифр
function toHref(raw: string): string {
	const d = String(raw || '').replace(/\D/g, '');
	if (d.length === 11 && d.startsWith('8')) return `+7${d.slice(1)}`;
	if (d.length === 11) return `+${d}`;
	if (d.length === 10) return `+7${d}`;
	return `+${d}`;
}

export function buildContacts(raw: {
	phoneDigits: string;
	tgLink: string;
	maxLink: string;
	pavelName: string;
	pavelPhone: string;
	email: string;
}): Contacts {
	const digits = String(raw.phoneDigits || '').replace(/\D/g, '');
	return {
		phoneDigits: digits,
		phone:
			digits.length === 11
				? `${digits[0]}(${digits.slice(1, 4)})${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
				: digits,
		phoneHref: digits.length === 11 && digits.startsWith('8') ? `+7${digits.slice(1)}` : `+${digits}`,
		tgLink: raw.tgLink,
		maxLink: raw.maxLink,
		pavelName: raw.pavelName,
		pavelPhone: raw.pavelPhone,
		pavelPhoneHref: toHref(raw.pavelPhone),
		email: raw.email
	};
}

const STORE_KEY = 'site_contacts';

export async function getContacts(): Promise<Contacts> {
	try {
		const rows = await sql`select value from settings where key = ${STORE_KEY} limit 1`;
		const stored = rows.length ? JSON.parse(rows[0].value) : {};
		// пустые строки в хранилище не перебивают дефолт («пустое поле = по умолчанию»)
		const clean = Object.fromEntries(
			Object.entries(stored && typeof stored === 'object' ? stored : {}).filter(
				([, v]) => v !== '' && v != null
			)
		);
		const raw = { ...DEFAULT_CONTACTS, ...clean };
		return buildContacts(raw);
	} catch {
		return buildContacts(DEFAULT_CONTACTS);
	}
}

export async function saveContacts(
	patch: Partial<{
		phoneDigits: string;
		tgLink: string;
		maxLink: string;
		pavelName: string;
		pavelPhone: string;
		email: string;
	}>
): Promise<Contacts> {
	const rows = await sql`select value from settings where key = ${STORE_KEY} limit 1`;
	const stored = rows.length ? JSON.parse(rows[0].value) : {};
	const merged = { ...DEFAULT_CONTACTS, ...(stored && typeof stored === 'object' ? stored : {}), ...patch };
	const json = JSON.stringify(merged);
	await sql`
		insert into settings (key, value, updated_at)
		values (${STORE_KEY}, ${json}, now())
		on conflict (key) do update set value = ${json}, updated_at = now()
	`;
	return getContacts();
}

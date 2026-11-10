import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { getContacts } from '$lib/server/contacts';
import type { AskoProduct } from '$lib/types/asko';

// Каталожные имена → группы фильтров витрины. Сушильные машины приходят
// из выгрузки без листа/группы — ловим по наименованию.
function groupLabel(group: string | null, root: string | null, name: string): string {
	if (/сушильная машина/i.test(name)) return 'Сушильные машины';
	if (root === 'Кухонные вытяжки' || group === 'Вытяжки встраиваемые') return 'Вытяжки';
	if (root === 'Профессиональная техника') return 'Профессиональная техника';
	return group || 'Прочее';
}

// Пререндер витрины: товары ASKO берутся из общей базы на этапе сборки
// (локально — с поднятым SSH-туннелем, на VPS база локальна).
export const load: PageServerLoad = async () => {
	const [rows, contacts, laundry] = await Promise.all([
		sql`
			SELECT p.name,
				p.price_rrc,
				p.stock,
				p.catalog_group_name,
				p.catalog_root_name,
				(SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id
					ORDER BY pi.position LIMIT 1) AS img
			FROM products p
			WHERE UPPER(p.brand->>'name') = 'ASKO'
				AND p.price_rrc IS NOT NULL
			ORDER BY (p.stock > 0) DESC NULLS LAST, p.price_rrc ASC, p.name
		`,
		getContacts(),
		// списки для конструктора комплекта (BundleQuiz): домашние стиральные +
		// сушильные машины; профессиональные стиралки («Прачечное оборудование») не берём
		sql`
			SELECT p.name,
				p.price_rrc,
				p.stock,
				(catalog_leaf_name = 'Фронтальные стиральные машины') AS is_washer,
				(SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id
					ORDER BY pi.position LIMIT 1) AS img
			FROM products p
			WHERE UPPER(p.brand->>'name') = 'ASKO'
				AND p.price_rrc IS NOT NULL
				AND (catalog_leaf_name = 'Фронтальные стиральные машины'
					OR p.name ILIKE '%сушильная машина%')
			ORDER BY (p.stock > 0) DESC NULLS LAST, p.price_rrc ASC, p.name
		`
	]);
	// строка запроса прачечного списка: имя, РРЦ, склад, флаг стиралки, картинка
	type LaundryRow = {
		name: string;
		price_rrc: number;
		stock: number | null;
		is_washer: boolean;
		img: string | null;
	};
	const toProduct = (r: LaundryRow): AskoProduct => ({
		name: r.name,
		price: Number(r.price_rrc),
		stock: r.stock === null ? null : Number(r.stock),
		group: '',
		img: r.img
	});
	const products: AskoProduct[] = rows.map((r) => ({
		name: r.name,
		price: Number(r.price_rrc),
		stock: r.stock === null ? null : Number(r.stock),
		group: groupLabel(r.catalog_group_name, r.catalog_root_name, r.name),
		img: r.img
	}));
	// строки postgres-js приходят нетипизированным Row — приводим к форме запроса
	const laundryRows = laundry as unknown as LaundryRow[];
	const washers: AskoProduct[] = laundryRows.filter((r) => r.is_washer).map(toProduct);
	const dryers: AskoProduct[] = laundryRows.filter((r) => !r.is_washer).map(toProduct);
	return { products, contacts, washers, dryers };
};

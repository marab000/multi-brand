import { sql } from '$lib/db';
import { getCatalogRoots } from '$lib/server/categories';
import { seoLandings } from '$lib/server/seoLandings';
import { brandSlug } from '$lib/utils/slugify';

// Список страниц, доступных для ручного SEO-редактирования
// (page_key стабилен — по нему применяются переопределения на страницах сайта)

export type SeoPageEntry = { key: string; name: string; path: string; group: string };

export async function buildSeoPageList(): Promise<SeoPageEntry[]> {
	const pages: SeoPageEntry[] = [];

	pages.push({ key: 'home', name: 'Главная', path: '/', group: 'Основные' });

	const staticPages: [string, string, string][] = [
		['about', 'О компании', '/about'],
		['contacts', 'Контакты', '/contacts'],
		['delivery', 'Доставка', '/delivery'],
		['podbor', 'Собери комплект техники', '/podbor'],
		['privacy', 'Политика конфиденциальности', '/privacy'],
		['offer', 'Договор оферты', '/offer'],
		['garantiya', 'Гарантия', '/garantiya'],
		['articles', 'Статьи (раздел)', '/articles']
	];
	for (const [key, name, path] of staticPages) {
		pages.push({ key, name, path, group: 'Статические' });
	}

	try {
		const rows = await sql`
			SELECT DISTINCT
				catalog_root_slug AS root_slug,
				catalog_group_slug AS group_slug,
				catalog_leaf_slug AS leaf_slug
			FROM products
			WHERE catalog_root_slug IS NOT NULL AND price_rrc IS NOT NULL
		`;
		const present = new Set(rows.map((r) => `${r.root_slug}|${r.group_slug ?? ''}|${r.leaf_slug ?? ''}`));
		const rootsWithProducts = new Set(rows.map((r) => r.root_slug));
		for (const root of getCatalogRoots()) {
			if (rootsWithProducts.has(root.slug)) {
				pages.push({
					key: `category:${root.slug}`,
					name: `Категория: ${root.name}`,
					path: `/catalog/${root.slug}`,
					group: 'Категории'
				});
			}
			for (const group of root.groups) {
				if (group.slug === root.slug) continue;
				// группы (средний уровень) тоже редактируются: у них свой page_key
				const groupHasProducts = group.leaves.some((leaf) =>
					present.has(`${root.slug}|${group.slug}|${leaf.slug}`)
				);
				if (groupHasProducts) {
					pages.push({
						key: `category:${root.slug}/${group.slug}`,
						name: `Раздел: ${group.name}`,
						path: `/catalog/${root.slug}/${group.slug}`,
						group: 'Категории'
					});
				}
				for (const leaf of group.leaves) {
					const key = `${root.slug}|${group.slug}|${leaf.slug}`;
					if (present.has(key)) {
						pages.push({
							key: `category:${root.slug}/${group.slug}/${leaf.slug}`,
							name: `Подкатегория: ${leaf.name}`,
							path: `/catalog/${root.slug}/${group.slug}/${leaf.slug}`,
							group: 'Категории'
						});
					}
				}
			}
		}
	} catch {
		// категории недоступны — пропускаем
	}

	// SEO-лендинги сверх дерева категорий (реестр seoLandings.ts)
	for (const landing of seoLandings) {
		pages.push({
			key: `landing:${landing.path}`,
			name: `Лендинг: ${landing.title}`,
			path: `/catalog/${landing.path}`,
			group: 'SEO-лендинги'
		});
	}

	try {
		const brandRows = await sql`
			select brand->>'name' as name
			from products
			where price_rrc is not null and brand->>'name' is not null
			group by 1
			having count(*) >= 3
			order by 1
		`;
		for (const b of brandRows) {
			const slug = brandSlug(b.name);
			if (slug) pages.push({ key: `brand:${slug}`, name: `Бренд: ${b.name}`, path: `/brands/${slug}`, group: 'Бренды' });
		}
	} catch {
		// бренды недоступны — пропускаем
	}

	return pages;
}

import { sql } from '$lib/db';
import {
	filterCatalogRootsByAvailability,
	getCatalogRoots,
	getCatalogShowcase
} from '$lib/server/categories';
import type { CatalogRoot, CatalogShowcaseSection } from '$lib/server/categories';

// Кэш «доступных» категорий: дерево меняется только после синка тетриса,
// поэтому пересобираем не чаще раза в TTL. Инвалидация — по таймеру,
// при желании форсировать можно рестартом процесса.
const TTL_MS = 3 * 60 * 1000;

let cache: {
	roots: CatalogRoot[];
	showcase: CatalogShowcaseSection[];
	filteredRoots: CatalogRoot[];
	builtAt: number;
} | null = null;

let inFlight: Promise<{
	roots: CatalogRoot[];
	showcase: CatalogShowcaseSection[];
	filteredRoots: CatalogRoot[];
}> | null = null;

async function build(): Promise<{
	roots: CatalogRoot[];
	showcase: CatalogShowcaseSection[];
	filteredRoots: CatalogRoot[];
}> {
	const availabilityRows = await sql`
		SELECT DISTINCT
			catalog_root_slug AS root_slug,
			catalog_group_slug AS group_slug,
			catalog_leaf_slug AS leaf_slug
		FROM products
		WHERE catalog_root_slug IS NOT NULL AND price_rrc IS NOT NULL
	`;
	const filteredRoots = filterCatalogRootsByAvailability(
		getCatalogRoots(),
		availabilityRows as any[]
	);
	return {
		roots: filteredRoots,
		showcase: getCatalogShowcase(filteredRoots),
		filteredRoots
	};
}

/** Доступные корни + showcase + filteredRoots с TTL-кэшем. Параллельные вызовы делят одну сборку. */
export async function getLiveCatalog(): Promise<{
	roots: CatalogRoot[];
	showcase: CatalogShowcaseSection[];
	filteredRoots: CatalogRoot[];
}> {
	if (cache && Date.now() - cache.builtAt < TTL_MS) {
		return cache;
	}
	if (!inFlight) {
		inFlight = build()
			.then((res) => {
				cache = { ...res, builtAt: Date.now() };
				return res;
			})
			.finally(() => {
				inFlight = null;
			});
	}
	return inFlight;
}

import { writable } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { apiFetch } from '$lib/api';
import { slugify } from '$lib/utils/slugify';
import {
	getBaseProductPrice,
	getProductPrice,
	hasProductDiscount,
	isDiscountExcludedBrand
} from '$lib/utils/pricing';
import type { Product } from '$lib/types/product';

export type FavoriteItem = {
	id: string;
	name: string;
	price: number;
	oldPrice?: number | null;
	image?: string;
	slug?: string;
	description?: string | null;
	brand?: string | null;
	protected?: boolean;
};

const STORAGE_KEY = 'favorites';

function createFavorites() {
	const { subscribe, set, update } = writable<FavoriteItem[]>([]);

	const load = () => {
		if (typeof localStorage === 'undefined') return;
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) set(JSON.parse(raw));
	};
	// Загружаем данные из localStorage сразу при создании store на клиенте
	load();

	const save = (items: FavoriteItem[]) => {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	};

	return {
		subscribe,
		init: () => {
			load();
		},
		sync: async () => {
			let current: FavoriteItem[] = [];
			const unsub = subscribe((items) => (current = items));
			unsub();
			if (!current.length) return;
			const ids = current.map((i) => i.id);
			try {
				const products = await apiFetch<Product[]>(fetch, `/api/products/batch?ids=${ids.join(',')}`);
				if (!Array.isArray(products) || !products.length) return;
				const productMap = new Map(products.map((p) => [p.id, p]));
				// Товары, которых нет в БД, удаляем
				const next = current
					.filter((item) => productMap.has(item.id))
					.map((item) => {
						const product = productMap.get(item.id)!;
						const price = getProductPrice(product);
						const oldPrice = getBaseProductPrice(product);
						const hasDiscount = hasProductDiscount(product) && oldPrice !== null && oldPrice > price;
						return {
							...item,
							name: product.name,
							price,
							oldPrice: hasDiscount ? oldPrice : null,
							image: product.images?.[0]?.url ?? item.image,
							slug: slugify(product.name),
							description: product.description,
							brand: product.brand?.name ?? item.brand,
							protected: isDiscountExcludedBrand(product.brand)
						} satisfies FavoriteItem;
					});
				save(next);
				set(next);
			} catch {
				// Сеть недоступна — оставляем старые данные
			}
		},
		toggle: (item: Omit<FavoriteItem, 'qty'>) =>
			update((items) => {
				const existing = items.find((i) => i.id === item.id);
				if (existing) {
					const next = items.filter((i) => i.id !== item.id);
					save(next);
					toast.success('Удалено из избранного');
					return next;
				}
				const next = [...items, { ...item }];
				save(next);
				toast.success('Добавлено в избранное');
				return next;
			}),
		remove: (id: string) =>
			update((items) => {
				const next = items.filter((i) => i.id !== id);
				save(next);
				return next;
			}),
		clear: () => {
			save([]);
			set([]);
		},
		has: (id: string) => {
			let found = false;
			const unsub = subscribe((items) => {
				found = items.some((i) => i.id === id);
			});
			unsub();
			return found;
		}
	};
}

export const favorites = createFavorites();

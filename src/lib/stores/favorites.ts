import { writable } from 'svelte/store';
import { toast } from 'svelte-sonner';

export type FavoriteItem = {
	id: string;
	name: string;
	price: number;
	oldPrice?: number | null;
	image?: string;
	slug?: string;
	description?: string | null;
};

const STORAGE_KEY = 'favorites';

function createFavorites() {
	const { subscribe, set, update } = writable<FavoriteItem[]>([]);

	const load = () => {
		if (typeof localStorage === 'undefined') return;
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) set(JSON.parse(raw));
	};

	const save = (items: FavoriteItem[]) => {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	};

	return {
		subscribe,
		init: () => {
			load();
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

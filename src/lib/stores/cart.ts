import { writable } from 'svelte/store';
import { toast } from 'svelte-sonner';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
  slug?: string;
  description?: string | null;
};

const STORAGE_KEY = 'cart';

function createCart() {
  const { subscribe, set, update } = writable<CartItem[]>([]);

  const load = () => {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) set(JSON.parse(raw));
  };

  const save = (items: CartItem[]) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  return {
    subscribe,
    init: () => {
      load();
    },
    add: (item: Omit<CartItem, 'qty'>) =>
      update((items) => {
        const existing = items.find((i) => i.id === item.id);
        let next;
        if (existing) {
          next = items.map((i) => (i.id === item.id ? { ...i, ...item, qty: i.qty + 1 } : i));
        } else {
          next = [...items, { ...item, qty: 1 }];
        }
        save(next);
        toast.success('Товар добавлен в корзину');
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
    inc: (id: string) =>
      update((items) => {
        const next = items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
        save(next);
        return next;
      }),
    dec: (id: string) =>
      update((items) => {
        const next = items
          .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
          .filter((i) => i.qty > 0);
        save(next);
        return next;
      })
  };
}

export const cart = createCart();

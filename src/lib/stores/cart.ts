import { writable } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import { apiFetch } from '$lib/api';
import { slugify } from '$lib/utils/slugify';
import {
  getBaseProductPrice,
  getProductPrice,
  hasProductDiscount,
  isDiscountExcludedBrand
} from '$lib/utils/pricing';
import type { Product } from '$lib/types/product';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  image?: string;
  qty: number;
  slug?: string;
  description?: string | null;
  brand?: string | null;
  protected?: boolean;
  /** Товар из конструктора «Собери кухню»: цена живая (следует за базой),
   *  но поверх всегда держится скидка комплекта bundleDiscount, sync() её восстанавливает */
  bundle?: boolean;
  /** Скидка комплекта, % */
  bundleDiscount?: number;
};

const STORAGE_KEY = 'cart';

function createCart() {
  const { subscribe, set, update } = writable<CartItem[]>([]);

  const load = () => {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) set(JSON.parse(raw));
  };
  // Загружаем данные из localStorage сразу при создании store на клиенте,
  // чтобы методы страницы (sync в onMount) видели уже заполненный store
  load();
  const save = (items: CartItem[]) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };
  return {
    subscribe,
    init: () => {
      load();
    },
    sync: async () => {
      let current: CartItem[] = [];
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
            // Комплект из конструктора: цена обновляется по базе, но поверх
            // всегда применяется скидка комплекта, зафиксированная при добавлении
            if (item.bundle) {
              const base = getProductPrice(product);
              const d = item.bundleDiscount ?? 0;
              const price = d > 0 ? Math.round(base * (1 - d / 100) * 1000) / 1000 : base;
              const fullPrice = getBaseProductPrice(product) ?? base;
              return {
                ...item,
                name: product.name,
                price,
                oldPrice: d > 0 && fullPrice > price ? fullPrice : null,
                image: product.images?.[0]?.url ?? item.image,
                slug: slugify(product.name),
                description: product.description,
                brand: product.brand?.name ?? item.brand
              } satisfies CartItem;
            }
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
            } satisfies CartItem;
          });
        save(next);
        set(next);
      } catch {
        // Сеть недоступна — оставляем старые данные
      }
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
        toast.success('Товар добавлен в корзину', {
          action: {
            label: 'Перейти в корзину',
            onClick: () => goto('/cart')
          }
        });
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

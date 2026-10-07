import { browser } from '$app/environment';

export type RecentlyViewedProduct = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  price?: number | null;
  description?: string | null;
};

const KEY = 'multibrand_recently_viewed';
const LIMIT = 8;

function read(): RecentlyViewedProduct[] {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: RecentlyViewedProduct[]) {
  if (!browser) return;
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, LIMIT)));
}

export const recentlyViewed = {
  get: read,
  add(product: RecentlyViewedProduct) {
    if (!browser || !product.slug) return;
    const next = [product, ...read().filter((item) => item.slug !== product.slug)].slice(0, LIMIT);
    write(next);
    window.dispatchEvent(new CustomEvent('recently-viewed:updated'));
  },
  clear() {
    if (!browser) return;
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent('recently-viewed:updated'));
  },
  // Удалённые из базы товары выкидываем навсегда (мёртвые карточки в блоке — 404 по клику)
  sync: async () => {
    const current = read();
    if (!current.length) return;
    try {
      const res = await fetch(`/api/products/batch?ids=${current.map((i) => i.id).join(',')}`);
      if (!res.ok) return;
      const products = await res.json();
      if (!Array.isArray(products) || !products.length) return;
      const alive = new Set(products.map((p) => p.id));
      const next = current.filter((item) => alive.has(item.id));
      if (next.length === current.length) return;
      write(next);
      window.dispatchEvent(new CustomEvent('recently-viewed:updated'));
    } catch {
      // сеть моргнула — вычистится при следующем заходе в каталог
    }
  }
};

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
  }
};

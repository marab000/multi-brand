import { apiFetch } from '$lib/api';

export async function loadProducts(fetch: typeof globalThis.fetch, query: URLSearchParams) {
  return apiFetch<{ products: any[]; total: number; pages: number; page: number }>(
    fetch,
    `/api/products?${query}`
  ).catch(() => ({ products: [], total: 0, pages: 1, page: 1 }));
}

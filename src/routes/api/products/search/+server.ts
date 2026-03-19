import { json } from '@sveltejs/kit';
import { fetchProducts } from '$lib/server/catalogApi';

export async function GET({ url }) {
  try {
    const search = url.searchParams.get('q')?.trim();
    if (!search || search.length < 2) return json([]);

    const { products } = await fetchProducts({ search }, 8, 0);
    return json(products);
  } catch (e) {
    console.error('SEARCH ERROR:', e);
    return json([]);
  }
}
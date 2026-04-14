import { json } from '@sveltejs/kit';
import { fetchProducts } from '$lib/server/catalogApi';

export async function GET({ url }) {
  try {
    const search = url.searchParams.get('search')?.trim();
    const categories = url.searchParams.getAll('category');
    const types = url.searchParams.getAll('type');
    const brands = url.searchParams.getAll('brand');
    const colors = url.searchParams.getAll('color');
    const priceMin = url.searchParams.get('priceFrom') ? Number(url.searchParams.get('priceFrom')) / 1000 : undefined;
    const priceMax = url.searchParams.get('priceTo') ? Number(url.searchParams.get('priceTo')) / 1000 : undefined;
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 9);
    const offset = (page - 1) * limit;

    const { products, total } = await fetchProducts(
      { search, categories, types, brands, colors, priceMin, priceMax },
      limit,
      offset
    );

    return json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (e) {
    console.error('API ERROR:', e);
    return json({ error: String(e) }, { status: 500 });
  }
}
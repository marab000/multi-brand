import { json } from '@sveltejs/kit';
import { fetchProducts } from '$lib/server/catalogApi';
import { toDbPrice } from '$lib/utils/formatPrice';

export async function GET({ url }) {
  try {
    const search = url.searchParams.get('search')?.trim() || undefined;
    const types = url.searchParams.getAll('type');
    const brands = url.searchParams.getAll('brand');
    const colors = url.searchParams.getAll('color');
    const priceMin = toDbPrice(url.searchParams.get('priceFrom'));
    const priceMax = toDbPrice(url.searchParams.get('priceTo'));
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 9);
    const offset = (page - 1) * limit;
    const { products, total } = await fetchProducts(
      {
        search,
        types: types.length ? types : undefined,
        brands: brands.length ? brands : undefined,
        colors: colors.length ? colors : undefined,
        priceMin,
        priceMax
      },
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

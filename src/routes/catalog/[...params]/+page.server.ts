import type { PageServerLoad } from './$types';
import { fetchProducts } from '$lib/server/catalogApi';
import { slugify } from '$lib/utils/slugify';
import { sql } from '$lib/db';

export const load: PageServerLoad = async ({ params, url }) => {
  const pathSegments = params.params ? params.params.split('/') : [];
  const categorySlug = pathSegments[0] || null;

  let category: string | null = null;
  if (categorySlug) {
    const rows = await sql`SELECT DISTINCT category FROM products`;
    const match = rows.find((r: any) => slugify(r.category?.trim()) === categorySlug);
    category = match ? match.category.trim() : null;
  }

  const filters = {
    search: url.searchParams.get('search')?.trim() || undefined,
    category: category || undefined,
    types: url.searchParams.getAll('type'),
    brands: url.searchParams.getAll('brand'),
    colors: url.searchParams.getAll('color'),
    priceMin: url.searchParams.get('price_min')
      ? Number(url.searchParams.get('price_min')) / 1000
      : undefined,
    priceMax: url.searchParams.get('price_max')
      ? Number(url.searchParams.get('price_max')) / 1000
      : undefined,
    specs: {
      width:
        url.searchParams.get('width_min') || url.searchParams.get('width_max')
          ? {
              min: url.searchParams.get('width_min')
                ? Number(url.searchParams.get('width_min'))
                : undefined,
              max: url.searchParams.get('width_max')
                ? Number(url.searchParams.get('width_max'))
                : undefined
            }
          : undefined,
      height:
        url.searchParams.get('height_min') || url.searchParams.get('height_max')
          ? {
              min: url.searchParams.get('height_min')
                ? Number(url.searchParams.get('height_min'))
                : undefined,
              max: url.searchParams.get('height_max')
                ? Number(url.searchParams.get('height_max'))
                : undefined
            }
          : undefined,
      depth:
        url.searchParams.get('depth_min') || url.searchParams.get('depth_max')
          ? {
              min: url.searchParams.get('depth_min')
                ? Number(url.searchParams.get('depth_min'))
                : undefined,
              max: url.searchParams.get('depth_max')
                ? Number(url.searchParams.get('depth_max'))
                : undefined
            }
          : undefined
    }
  };

  const perPage = 50;
  let page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
  const { total } = await fetchProducts(filters, 1, 0);
  const pages = Math.ceil(total / perPage) || 1;
  if (page > pages) page = pages;

  const offset = (page - 1) * perPage;

  const { products } = await fetchProducts(filters, perPage, offset);

  const colorsQuery = `
    SELECT DISTINCT trim(p.specs->>'Цвет') as color
    FROM products p
    ${filters.category ? `WHERE trim(p.category)='${filters.category}'` : ''}
    ORDER BY color
  `;
  const colorsRows = await sql.unsafe(colorsQuery);
  const colorsList = colorsRows.map((r: any) => r.color?.trim()).filter(Boolean);

  return {
    products,
    category,
    total,
    perPage,
    page,
    pages,
    currentSearch: url.searchParams.toString(),
    colors: colorsList
  };
};

import type { PageServerLoad } from './$types';
import { fetchProducts } from '$lib/server/catalogApi';
import { slugify } from '$lib/utils/slugify';
import { sql } from '$lib/db';

export const load: PageServerLoad = async ({ params, url }) => {
  const pathSegments = params.params ? params.params.split('/') : [];
  const categorySlug = pathSegments[0] || null;

  let categoryFromPath: string | null = null;

  if (categorySlug) {
    const rows = await sql`SELECT DISTINCT category FROM products`;
    const match = rows.find((r: any) => slugify(r.category?.trim()) === categorySlug);
    categoryFromPath = match ? match.category.trim() : null;
  }

  const categoryFilters = url.searchParams.getAll('category');

  const filters: any = {
    search: url.searchParams.get('search')?.trim() || undefined,

    categories: categoryFilters.length
      ? categoryFilters
      : categoryFromPath
        ? [categoryFromPath]
        : undefined,

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
  const offset = (page - 1) * perPage;

  const { products, total } = await fetchProducts(filters, perPage, offset);

  const pages = Math.ceil(total / perPage) || 1;
  if (page > pages) page = pages;

  const where: string[] = [];

  if (filters.categories?.length) {
    where.push(
      `trim(category)=ANY(ARRAY[${filters.categories.map((c: string) => `'${c}'`).join(',')}])`
    );
  }

  if (filters.brands?.length) {
    where.push(
      `LOWER(TRIM(brand->>'name')) = ANY(ARRAY[${filters.brands.map((b) => `'${b.toLowerCase().trim()}'`).join(',')}])`
    );
  }

  if (filters.colors?.length) {
    where.push(
      `trim(specs->>'Цвет')=ANY(ARRAY[${filters.colors.map((c: string) => `'${c}'`).join(',')}])`
    );
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await sql.unsafe(`
    SELECT specs, price_rrc, price_ric
    FROM products
    ${whereSQL}
  `);

  return {
    products,
    category: categoryFromPath,
    total,
    perPage,
    page,
    pages,
    currentSearch: url.searchParams.toString()
  };
};

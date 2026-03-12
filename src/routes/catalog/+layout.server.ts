import type { LayoutServerLoad } from './$types';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

export const load: LayoutServerLoad = async ({ url }) => {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const categorySlug = pathSegments[1] || null;
  let category: string | null = null;
  if (categorySlug) {
    const rows = await sql`select distinct category from products`;
    const match = rows.find((r: any) => slugify(r.category?.trim()) === categorySlug);
    category = match ? match.category.trim() : null;
  }
  let products;
  if (category) {
    products = await sql`
      select brand_name,category,product_type,price_rrc
      from products
      where is_active=true
      and price_rrc is not null
      and trim(category)=${category}
    `;
  } else {
    products = await sql`
      select brand_name,category,product_type,price_rrc
      from products
      where is_active=true
      and price_rrc is not null
    `;
  }
  const brands = [...new Set(products.map((p: any) => p.brand_name?.trim()).filter(Boolean))];
  const types = [...new Set(products.map((p: any) => p.product_type?.trim()).filter(Boolean))];
  const prices = products.map((p: any) => Math.round(Number(p.price_rrc) * 1000));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  return {
    brands,
    types,
    minPrice,
    maxPrice
  };
};

import type { LayoutServerLoad } from './$types';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';

function parseSize(v: string | null) {
  if (!v) return null;
  const m = v.replace(',', '.').match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

export const load: LayoutServerLoad = async ({ url }) => {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const categorySlug = pathSegments[1] || null;
  let category: string | null = null;

  if (categorySlug) {
    const rows = await sql`SELECT DISTINCT category FROM products`;
    const match = rows.find((r: any) => slugify(r.category?.trim()) === categorySlug);
    category = match ? match.category.trim() : null;
  }

  const values: any[] = [];
  let where = 'WHERE price_rrc IS NOT NULL';
  if (category) {
    values.push(category);
    where += ` AND trim(category)=$1`;
  }

  const products = await sql.unsafe(
    `
    SELECT
      brand->>'name' as brand_name,
      product_type,
      price_rrc,
      specs->>'Цвет' as color,
      specs->>'Ширина' as width,
      specs->>'Высота' as height,
      specs->>'Глубина' as depth
    FROM products
    ${where}
  `,
    values
  );

  const brands = [...new Set(products.map((p: any) => p.brand_name?.trim()).filter(Boolean))];
  const types = [...new Set(products.map((p: any) => p.product_type?.trim()).filter(Boolean))];
  const colors = [...new Set(products.map((p: any) => p.color?.trim()).filter(Boolean))];

  const prices = products.map((p: any) => Math.round(Number(p.price_rrc) * 1000));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const widths = products.map((p: any) => parseSize(p.width)).filter(Boolean);
  const heights = products.map((p: any) => parseSize(p.height)).filter(Boolean);
  const depths = products.map((p: any) => parseSize(p.depth)).filter(Boolean);

  return {
    brands,
    types,
    colors,
    minPrice,
    maxPrice,
    widthMin: widths.length ? Math.min(...widths) : 0,
    widthMax: widths.length ? Math.max(...widths) : 0,
    heightMin: heights.length ? Math.min(...heights) : 0,
    heightMax: heights.length ? Math.max(...heights) : 0,
    depthMin: depths.length ? Math.min(...depths) : 0,
    depthMax: depths.length ? Math.max(...depths) : 0
  };
};

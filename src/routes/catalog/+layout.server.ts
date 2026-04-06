import type { LayoutServerLoad } from './$types';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';
import { getTypeGroups } from '$lib/server/getTypeGroups';

function parseSpecsValue(specs: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const val = specs?.[key];
    if (!val) continue;

    const str = String(val).replace(',', '.');
    const match = str.match(/\d+(\.\d+)?/);

    if (match) {
      const num = parseFloat(match[0]);
      if (!isNaN(num)) return num;
    }
  }
  return null;
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
      category,
      price_rrc,
      specs
    FROM products
    ${where}
  `,
    values
  );

  const brands = [...new Set(products.map((p: any) => p.brand_name?.trim()).filter(Boolean))];

  //
  const typeGroups = await getTypeGroups(category || undefined);

  const colors = [...new Set(products.map((p: any) => p.specs?.['Цвет']?.trim()).filter(Boolean))];

  const prices = products.map((p: any) => Math.round(Number(p.price_rrc) * 1000));
  const priceMax = prices.length ? Math.max(...prices) : 0;

  const map = {
    width: ['Размер (Ширина)', 'Размер (Ширина), см', 'Ширина прибора'],
    height: ['Размер (Высота)', 'Размер (Высота), см', 'Высота прибора'],
    depth: ['Размер (Глубина)', 'Размер (Глубина), см', 'Глубина прибора']
  };

  const widths = products
    .map((p: any) => parseSpecsValue(p.specs, map.width))
    .filter((v) => v != null);
  const heights = products
    .map((p: any) => parseSpecsValue(p.specs, map.height))
    .filter((v) => v != null);
  const depths = products
    .map((p: any) => parseSpecsValue(p.specs, map.depth))
    .filter((v) => v != null);

  const widthMax = widths.length ? Math.max(...widths) : 0;
  const heightMax = heights.length ? Math.max(...heights) : 0;
  const depthMax = depths.length ? Math.max(...depths) : 0;

  return {
    brands,
    typeGroups,
    colors,

    minMax: {
      price: [0, priceMax],
      width: [0, widthMax],
      height: [0, heightMax],
      depth: [0, depthMax]
    }
  };
};

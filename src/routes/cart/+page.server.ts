import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { DEFAULT_CART_DISCOUNT_PERCENT, DEFAULT_EXCLUDED_BRANDS } from '$lib/utils/pricing';

export const load: PageServerLoad = async ({ locals }) => {
  let cartDiscountPercent = DEFAULT_CART_DISCOUNT_PERCENT;
  let excludedBrands: string[] = DEFAULT_EXCLUDED_BRANDS;
  try {
    const rows = await sql`SELECT key, value FROM settings WHERE key IN ('cart_discount_percent', 'excluded_brands')`;
    for (const row of rows) {
      if (row.key === 'cart_discount_percent') {
        cartDiscountPercent = Number(row.value) || 0;
      }
      if (row.key === 'excluded_brands') {
        try {
          excludedBrands = JSON.parse(row.value);
        } catch {
          // оставляем дефолт
        }
      }
    }
  } catch {
    // таблицы нет — дефолт
  }
  return { user: locals.user, cartDiscountPercent, excludedBrands };
};

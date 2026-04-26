import type { Product } from '$lib/types/product';

export const FEED_ALLOWED_BRANDS = [
  'Asko',
  'Bosch',
  'Aeg',
  'Evelux',
  'Franke',
  'Korting',
  'Hiberg',
  'Kuppersbusch',
  'Kuppersberg',
  'Liebherr',
  'Smeg',
  'Miele',
  'Haier',
  'Omoikiri'
];

export const FEED_EXCLUDED_CATEGORIES = [
  'Мелкая бытовая техника',
  'Запчасти и аксессуары для техники'
];

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

export function isProductAllowedForFeed(product: Product) {
  const brand = normalize(product.brand?.name);
  const category = normalize(product.category);
  const allowedBrands = FEED_ALLOWED_BRANDS.map(normalize);
  const excludedCategories = FEED_EXCLUDED_CATEGORIES.map(normalize);
  if (!brand || !allowedBrands.includes(brand)) return false;
  if (excludedCategories.includes(category)) return false;
  if (!product.price_rrc || product.price_rrc <= 0) return false;
  if (!product.images?.length) return false;
  return true;
}

import { normalizePrice } from '$lib/utils/formatPrice';
import type { Product } from '$lib/types/product';
const DISCOUNT_PERCENT = 13;
const EXCLUDED_BRANDS = ['asko', 'omoikiri'];
const normalizeBrand = (brand?: string | null) =>
  String(brand ?? '')
    .trim()
    .toLowerCase();
export function isDiscountExcludedBrand(brand?: string | null) {
  return EXCLUDED_BRANDS.includes(normalizeBrand(brand));
}
export function getBaseProductPrice(product: Pick<Product, 'price_rrc' | 'price_ric'>) {
  return product.price_rrc ?? product.price_ric ?? null;
}
export function getDiscountedPrice(price: number | null | undefined, brand?: string | null) {
  if (!price) return 0;
  if (isDiscountExcludedBrand(brand)) return price;
  return Math.round(normalizePrice(price) * (1 - DISCOUNT_PERCENT / 100)) / 1000;
}
export function getProductPrice(product: Pick<Product, 'price_rrc' | 'price_ric' | 'brand'>) {
  return getDiscountedPrice(getBaseProductPrice(product), product.brand?.name);
}
export function hasProductDiscount(product: Pick<Product, 'price_rrc' | 'price_ric' | 'brand'>) {
  const basePrice = getBaseProductPrice(product);
  return !!basePrice && getProductPrice(product) < basePrice;
}

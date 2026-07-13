import type { Product } from '$lib/types/product';
export const DISCOUNT_PERCENT = 0;
export const INSTALLMENT_MONTHS = 12;
export const IS_KIT_DISCOUNT = true;
export const CART_DISCOUNT_PERCENT = 15;
const EXCLUDED_BRANDS = ['asko', 'omoikiri', 'franke'];
const normalizeBrand = (brand?: string | null) =>
  String(brand ?? '')
    .trim()
    .toLowerCase();
export function getDiscountLabel() {
  return `-${DISCOUNT_PERCENT}%`;
}
export function getInstallmentLabel() {
  return `рассрочка ${INSTALLMENT_MONTHS} мес.`;
}
type BrandLike =
  | string
  | null
  | undefined
  | { name?: string | null; api?: string | null; protected?: boolean };
export function isDiscountExcludedBrand(brand?: BrandLike, protectedFlag?: boolean) {
  if (protectedFlag) return true;
  if (!brand) return false;
  // Поддерживаем как строку (CartItem.brand), так и объект бренда с полями name/api/protected
  if (typeof brand !== 'string' && brand.protected) return true;
  const name = typeof brand === 'string' ? brand : brand.name;
  const api = typeof brand === 'string' ? '' : brand.api;
  const normalized = normalizeBrand(name);
  const normalizedApi = normalizeBrand(api);
  if (EXCLUDED_BRANDS.includes(normalized)) return true;
  // Тетрасис помечает защищённый ассортимент: «Midea защищенный ассортимент» и т.п.
  // Метка может быть в name (старые записи) или в api (оригинальное название из тетрасиса)
  if (/защищен|защищён/.test(normalized)) return true;
  if (/защищен|защищён/.test(normalizedApi)) return true;
  return false;
}
export function isKitProduct(product: Pick<Product, 'external_id' | 'raw'>) {
  return (
    String(product.external_id || '').startsWith('kit:') ||
    product.raw?.imported_from === 'tetrasis-kit' ||
    product.raw?.source === 'tetrasis-kit'
  );
}
export function getBaseProductPrice(product: Pick<Product, 'price_rrc' | 'price_ric'>) {
  return product.price_rrc ?? product.price_ric ?? null;
}
export function getDiscountedPrice(
  price: number | string | null | undefined,
  brand?: BrandLike,
  isKit = false
) {
  const value = Number(price);
  if (!value || !Number.isFinite(value)) return 0;
  if ((isKit && !IS_KIT_DISCOUNT) || isDiscountExcludedBrand(brand)) return value;
  return value * (1 - DISCOUNT_PERCENT / 100);
}
export function getMonthlyPayment(price: number | string | null | undefined) {
  const value = Number(price);
  if (!value || !Number.isFinite(value)) return 0;
  return value / INSTALLMENT_MONTHS;
}
export function applyCartDiscount(price: number | string | null | undefined) {
  const value = Number(price);
  if (!value || !Number.isFinite(value)) return 0;
  return value * (1 - CART_DISCOUNT_PERCENT / 100);
}
export function getProductPrice(
  product: Pick<Product, 'price_rrc' | 'price_ric' | 'brand' | 'external_id' | 'raw'>
) {
  return getDiscountedPrice(
    getBaseProductPrice(product),
    product.brand,
    isKitProduct(product)
  );
}
export function hasProductDiscount(
  product: Pick<Product, 'price_rrc' | 'price_ric' | 'brand' | 'external_id' | 'raw'>
) {
  const basePrice = Number(getBaseProductPrice(product));
  return !!basePrice && getProductPrice(product) < basePrice;
}

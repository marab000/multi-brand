export function toDisplayPrice(price: number | string | null | undefined) {
  const value = Number(price);
  if (!value || !Number.isFinite(value)) return 0;
  return Math.round(value * 1000);
}
export function toDbPrice(price: number | string | null | undefined) {
  const value = Number(price);
  if (!value || !Number.isFinite(value)) return undefined;
  return value / 1000;
}
export function formatPrice(price: number | string | null | undefined) {
  const value = toDisplayPrice(price);
  if (!value) return '';
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0
  }).format(value);
}

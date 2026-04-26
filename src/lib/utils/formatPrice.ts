export function normalizePrice(price: number | null | undefined) {
  if (!price) return 0;
  return Math.round(price * 1000);
}

export function formatPrice(price: number | null | undefined) {
  const value = normalizePrice(price);
  if (!value) return '';
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0
  }).format(value);
}

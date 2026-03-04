export function formatPrice(price: number | null | undefined) {
  if (!price) return '';

  const value = Math.round(price * 1000);

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0
  }).format(value);
}
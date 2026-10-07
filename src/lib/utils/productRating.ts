type ProductRating = {
  rating: string;
  reviews: number;
};

// Стабильный «псевдослучайный» хеш: у одного товара числа не скачут день ото дня
function hashSeed(seed: string | number | null | undefined): number {
  const value = String(seed || 'product');
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getProductRating(seed: string | number | null | undefined): ProductRating {
  const hash = hashSeed(seed);
  return { rating: '4.9', reviews: 500 + (hash % 1501) };
}

/** «Сегодня купили: N» — стабильное в течение суток число для конкретного товара */
export function getBoughtToday(seed: string | number | null | undefined): number {
  const hash = hashSeed(seed);
  const day = Math.floor(Date.now() / 86_400_000);
  // XOR даёт знаковый int32 — без >>> 0 остаток бывал отрицательным («купили -6»)
  return 1 + (((hash ^ day) >>> 0) % 9);
}

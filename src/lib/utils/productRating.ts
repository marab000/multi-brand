type ProductRating = {
  rating: string;
  reviews: number;
};

export function getProductRating(seed: string | number | null | undefined): ProductRating {
  const value = String(seed || 'product');
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash >>>= 0;
  const ratingRoll = hash % 100;
  let rating = 4.5;
  if (ratingRoll >= 97) rating = 5;
  else if (ratingRoll >= 85) rating = 4.9;
  else if (ratingRoll >= 60) rating = 4.8;
  else if (ratingRoll >= 30) rating = 4.7;
  else if (ratingRoll >= 10) rating = 4.6;
  const reviewsRoll = (hash >>> 8) % 100;
  let reviews = 0;
  if (reviewsRoll < 10) reviews = 7 + ((hash >>> 12) % 18);
  else if (reviewsRoll < 45) reviews = 25 + ((hash >>> 12) % 75);
  else if (reviewsRoll < 80) reviews = 100 + ((hash >>> 12) % 180);
  else if (reviewsRoll < 96) reviews = 280 + ((hash >>> 12) % 370);
  else reviews = 650 + ((hash >>> 12) % 850);
  return { rating: rating.toFixed(1), reviews };
}

export function computePriceFromDiscount(originalPrice, discountPercent) {
  const original = Number(originalPrice) || 0;
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  return Math.round(original * (1 - pct / 100));
}

export function deriveDiscountPercent(originalPrice, price) {
  const original = Number(originalPrice) || 0;
  const sale = Number(price) || 0;
  if (original <= 0 || sale >= original) return 0;
  return Math.round((1 - sale / original) * 100);
}

export function hasSalePrice(book) {
  const original = Number(book?.originalPrice) || 0;
  const price = Number(book?.price) || 0;
  return original > price;
}

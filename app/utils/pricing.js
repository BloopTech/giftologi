/**
 * Determines whether a product is currently on sale based on sale_price and date range.
 * Returns { isOnSale, effectivePrice, originalPrice, discountPercent }
 *
 * @param {object} product - Must have: price, sale_price, sale_starts_at, sale_ends_at
 * @param {number} [serviceCharge=0] - Optional service charge added to the price
 * @returns {object}
 */
export function getEffectivePrice(product, serviceCharge = 0) {
  const basePrice = Number(product?.price);
  const charge = Number(serviceCharge) || 0;
  const originalPrice = Number.isFinite(basePrice) ? basePrice + charge : charge;

  const salePrice = Number(product?.sale_price);
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return { isOnSale: false, effectivePrice: originalPrice, originalPrice, discountPercent: 0 };
  }

  const now = Date.now();
  const startsAt = product?.sale_starts_at ? new Date(product.sale_starts_at).getTime() : null;
  const endsAt = product?.sale_ends_at ? new Date(product.sale_ends_at).getTime() : null;

  if (startsAt && !Number.isNaN(startsAt) && now < startsAt) {
    return { isOnSale: false, effectivePrice: originalPrice, originalPrice, discountPercent: 0 };
  }
  if (endsAt && !Number.isNaN(endsAt) && now > endsAt) {
    return { isOnSale: false, effectivePrice: originalPrice, originalPrice, discountPercent: 0 };
  }

  const effectivePrice = salePrice + charge;
  const discountPercent =
    originalPrice > 0
      ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
      : 0;

  return { isOnSale: true, effectivePrice, originalPrice, discountPercent };
}

/**
 * Format a numeric price as "GHS X.XX"
 */
export function formatPrice(value) {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
}

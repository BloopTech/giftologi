export const computeShipmentWeight = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return 0;

  return items.reduce((sum, item) => {
    if (!item) return sum;
    const quantity = Number(item?.quantity ?? item?.qty ?? 0);
    const unitWeight = Number(
      item?.weight_kg ??
        item?.weightKg ??
        item?.product?.weight_kg ??
        item?.product?.weightKg ??
        item?.product?.weight
    );

    if (!Number.isFinite(unitWeight)) return sum;
    const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
    return sum + unitWeight * (safeQuantity || 0);
  }, 0);
};

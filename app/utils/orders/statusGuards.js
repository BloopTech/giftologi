export const SHIPMENT_ALLOWED_PRIOR_STATUSES = ["paid", "shipped", "delivered"];
export const DELIVERY_ALLOWED_PRIOR_STATUSES = ["paid", "shipped", "delivered"];
export const DELIVERY_CONFIRMABLE_ORDER_STATUSES = ["paid", "shipped", "delivered"];

export function mapOrderStatusGuardDbError(error, fallbackMessage) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (code === "23514") {
    if (normalized.includes("moving to shipped")) {
      return "Order must be paid before it can be marked as shipped.";
    }

    if (normalized.includes("moving to delivered")) {
      return "Order must be paid or already shipped before it can be marked as delivered.";
    }

    if (normalized.includes("item can be marked")) {
      return "Order must be paid before an item can be marked as shipped or delivered.";
    }

    return "Order must be paid before shipping or delivery status can be applied.";
  }

  if (code === "23503" && normalized.includes("parent order not found")) {
    return "Parent order was not found for this item. Refresh and try again.";
  }

  return fallbackMessage || message || "Unable to complete this action right now.";
}

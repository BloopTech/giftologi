"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createAdminClient,
  createClient,
} from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";

const defaultErrors = {
  orderItemId: [],
  fulfillmentStatus: [],
};

const allowedStatuses = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

const updateFulfillmentSchema = z.object({
  orderItemId: z.string().uuid({ message: "Invalid order item" }),
  fulfillmentStatus: z
    .string()
    .transform((value) => String(value || "").toLowerCase())
    .refine((value) => allowedStatuses.includes(value), {
      message: "Invalid fulfillment status",
    }),
});

function generateTrackingId(orderId, orderItemId) {
  const orderPart = String(orderId || "")
    .replace(/-/g, "")
    .toUpperCase()
    .slice(0, 6);
  const itemPart = String(orderItemId || "")
    .replace(/-/g, "")
    .toUpperCase()
    .slice(0, 6);
  const timePart = Date.now().toString(36).toUpperCase();

  return `GFT-${orderPart || "ORDER"}-${itemPart || "ITEM"}-${timePart}`;
}

export async function updateOrderItemFulfillment(prevState, formData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update fulfillment.",
      errors: { ...defaultErrors },
      values: {},
      data: {},
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  const allowedRoles = ["super_admin", "operations_manager_admin"];
  if (!profile || !allowedRoles.includes(String(profile.role || "").toLowerCase())) {
    return {
      message: "You are not authorized to update fulfillment.",
      errors: { ...defaultErrors },
      values: {},
      data: {},
    };
  }

  const raw = {
    orderItemId: formData.get("orderItemId"),
    fulfillmentStatus: formData.get("fulfillmentStatus"),
  };

  const parsed = updateFulfillmentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { orderItemId, fulfillmentStatus } = parsed.data;

  const { data: existingItem, error: existingError } = await adminClient
    .from("order_items")
    .select("id, order_id, fulfillment_status, tracking_number")
    .eq("id", orderItemId)
    .maybeSingle();

  if (existingError || !existingItem) {
    return {
      message: existingError?.message || "Order item not found.",
      errors: { ...defaultErrors },
      values: raw,
      data: {},
    };
  }

  const requiresTracking =
    fulfillmentStatus === "shipped" || fulfillmentStatus === "delivered";
  const nextTracking = requiresTracking
    ? existingItem.tracking_number ||
      generateTrackingId(existingItem.order_id, orderItemId)
    : existingItem.tracking_number || null;

  const { error: updateError } = await adminClient
    .from("order_items")
    .update({
      fulfillment_status: fulfillmentStatus,
      tracking_number: nextTracking,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderItemId);

  if (updateError) {
    return {
      message: updateError.message || "Failed to update fulfillment.",
      errors: { ...defaultErrors },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id || user.id,
    adminRole: profile.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "updated_order_item_fulfillment",
    entity: "order_items",
    targetId: orderItemId,
    details: `Updated fulfillment status from ${existingItem.fulfillment_status || "pending"} to ${fulfillmentStatus}`,
  });

  revalidatePath("/dashboard/admin/orders");
  revalidatePath("/dashboard/admin/transactions");

  return {
    message: "Fulfillment updated.",
    errors: {},
    values: {},
    data: {
      orderItemId,
      orderId: existingItem.order_id,
      fulfillmentStatus,
      trackingNumber: nextTracking,
    },
  };
}

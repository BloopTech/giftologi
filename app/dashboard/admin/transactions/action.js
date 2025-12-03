"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";

const defaultUpdateOrderStatusValues = {
  orderId: [],
  newStatus: [],
};

const allowedStatuses = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid({ message: "Invalid order" }),
  newStatus: z
    .string()
    .transform((value) => String(value || "").toLowerCase())
    .refine((value) => allowedStatuses.includes(value), {
      message: "Invalid status",
    }),
});

export async function updateOrderStatus(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update orders.",
      errors: { ...defaultUpdateOrderStatusValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "finance_admin",
    "operations_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to update orders.",
      errors: { ...defaultUpdateOrderStatusValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    orderId: formData.get("orderId"),
    newStatus: formData.get("newStatus"),
  };

  const parsed = updateOrderStatusSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { orderId, newStatus } = parsed.data;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return {
      message: orderError?.message || "Order not found.",
      errors: { ...defaultUpdateOrderStatusValues },
      values: raw,
      data: {},
    };
  }

  if (order.status && String(order.status).toLowerCase() === newStatus) {
    return {
      message: "Order is already in this status.",
      errors: {},
      values: {},
      data: { orderId, newStatus },
    };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultUpdateOrderStatusValues },
      values: raw,
      data: {},
    };
  }

  if (newStatus === "shipped" || newStatus === "delivered") {
    await supabase
      .from("order_items")
      .update({ fulfillment_status: newStatus })
      .eq("order_id", orderId);
  }

  revalidatePath("/dashboard/admin/transactions");
  revalidatePath("/dashboard/admin");

  const previousStatus = order.status || "unknown";
  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "updated_order_status",
    entity: "orders",
    targetId: orderId,
    details: `Updated order status from ${previousStatus} to ${newStatus}`,
  });

  return {
    message: "Order status updated.",
    errors: {},
    values: {},
    data: { orderId, newStatus },
  };
}

const defaultInitiateRefundValues = {
  orderId: [],
  reason: [],
};

const initiateRefundSchema = z.object({
  orderId: z.string().uuid({ message: "Invalid order" }),
  reason: z
    .string()
    .trim()
    .min(1, { message: "Refund reason is required" }),
});

export async function initiateOrderRefund(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to initiate refunds.",
      errors: { ...defaultInitiateRefundValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "finance_admin",
    "operations_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to initiate refunds.",
      errors: { ...defaultInitiateRefundValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
  };

  const parsed = initiateRefundSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { orderId, reason } = parsed.data;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total_amount, status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return {
      message: orderError?.message || "Order not found.",
      errors: { ...defaultInitiateRefundValues },
      values: raw,
      data: {},
    };
  }

  const { data: paymentRows } = await supabase
    .from("order_payments")
    .select("id, amount, status, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1);

  const primaryPayment = Array.isArray(paymentRows) ? paymentRows[0] : null;

  let amountValue = 0;
  if (typeof primaryPayment?.amount === "number") {
    amountValue = primaryPayment.amount;
  } else if (typeof order.total_amount === "number") {
    amountValue = order.total_amount;
  }

  if (!Number.isFinite(Number(amountValue)) || Number(amountValue) <= 0) {
    return {
      message: "This order does not have a valid amount to refund.",
      errors: { ...defaultInitiateRefundValues },
      values: raw,
      data: {},
    };
  }

  const { data: refund, error: refundError } = await supabase
    .from("order_refunds")
    .insert([
      {
        order_id: orderId,
        payment_id: primaryPayment?.id || null,
        amount: amountValue,
        status: "pending",
        reason,
        created_by: currentProfile?.id || user.id,
        meta: null,
      },
    ])
    .select("id")
    .single();

  if (refundError || !refund) {
    return {
      message: refundError?.message || "Failed to create refund request.",
      errors: { ...defaultInitiateRefundValues },
      values: raw,
      data: {},
    };
  }

  // Mark order as disputed for reporting
  await supabase
    .from("orders")
    .update({ status: "disputed", updated_at: new Date().toISOString() })
    .eq("id", orderId);

  revalidatePath("/dashboard/admin/transactions");
  revalidatePath("/dashboard/admin");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "initiated_order_refund",
    entity: "orders",
    targetId: orderId,
    details: `Initiated refund of ${amountValue} for order ${orderId}`,
  });

  return {
    message: "Refund request initiated.",
    errors: {},
    values: {},
    data: { orderId, refundId: refund.id },
  };
}

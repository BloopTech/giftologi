"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

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

  return {
    message: "Order status updated.",
    errors: {},
    values: {},
    data: { orderId, newStatus },
  };
}

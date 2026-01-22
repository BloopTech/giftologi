"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

const updateStatusSchema = z.object({
  orderItemId: z.string().uuid("Invalid order item ID"),
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
});

export async function manageOrders(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in.",
      errors: {},
      values: {},
    };
  }

  const action = formData.get("action");

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id")
    .eq("profiles_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vendorError || !vendor) {
    return {
      success: false,
      message: "Vendor profile not found.",
      errors: {},
      values: {},
    };
  }

  if (action === "update_status") {
    const rawData = {
      orderItemId: formData.get("orderItemId"),
      status: formData.get("status"),
    };

    const validation = updateStatusSchema.safeParse(rawData);

    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0];
        fieldErrors[field] = err.message;
      });
      return {
        success: false,
        message: "Invalid data provided.",
        errors: fieldErrors,
        values: rawData,
      };
    }

    const { data: orderItem, error: orderItemError } = await supabase
      .from("order_items")
      .select("id, vendor_id")
      .eq("id", validation.data.orderItemId)
      .eq("vendor_id", vendor.id)
      .single();

    if (orderItemError || !orderItem) {
      return {
        success: false,
        message: "Order item not found or access denied.",
        errors: {},
        values: rawData,
      };
    }

    const { error: updateError } = await supabase
      .from("order_items")
      .update({ vendor_status: validation.data.status })
      .eq("id", validation.data.orderItemId);

    if (updateError) {
      console.error("Order status update error:", updateError);
      return {
        success: false,
        message: updateError.message || "Failed to update order status.",
        errors: {},
        values: rawData,
      };
    }

    revalidatePath("/dashboard/v/orders");

    return {
      success: true,
      message: "Order status updated successfully!",
      errors: {},
      values: {},
      newStatus: validation.data.status,
    };
  }

  return {
    success: false,
    message: "Invalid action.",
    errors: {},
    values: {},
  };
}

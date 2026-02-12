"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import {
  dispatchNotification,
  dispatchNotificationBulk,
  dispatchToAdmins,
} from "../../../utils/notificationService";

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
  const adminClient = createAdminClient();

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
    .select("id, status, registry_id, order_code")
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
  };

  try {
    const orderCodeLabel = order?.order_code || orderId?.slice(0, 8);
    const orderItemsResponse = await adminClient
      .from("order_items")
      .select("vendor_id")
      .eq("order_id", orderId);
    const vendorIds = Array.from(
      new Set(orderItemsResponse.data?.map((item) => item?.vendor_id).filter(Boolean))
    );

    if (newStatus === "cancelled" && vendorIds.length) {
      const { data: vendorRows } = await adminClient
        .from("vendors")
        .select("id, profiles_id, business_name")
        .in("id", vendorIds);

      for (const vendor of vendorRows || []) {
        if (!vendor?.profiles_id) continue;

        await dispatchNotification({
          client: adminClient,
          recipientId: vendor.profiles_id,
          recipientRole: "vendor",
          eventType: "order_status",
          message: `Order ${orderCodeLabel} was cancelled.`,
          link: "/dashboard/v/orders",
          data: {
            order_id: orderId,
            order_code: order?.order_code || null,
            status: newStatus,
            vendor_id: vendor.id,
          },
          vendorId: vendor.id,
        });
      }
    }

    if (
      order?.registry_id &&
      ["shipped", "delivered", "cancelled"].includes(newStatus)
    ) {
      const { data: registry } = await adminClient
        .from("registries")
        .select("id, registry_code, registry_owner_id, title")
        .eq("id", order.registry_id)
        .maybeSingle();

      if (registry?.registry_owner_id) {
        const statusLabel =
          newStatus === "shipped"
            ? "shipped"
            : newStatus === "delivered"
            ? "delivered"
            : "cancelled";

        const dashboardLink = registry.registry_code
          ? `/dashboard/h/registry/${registry.registry_code}`
          : "/dashboard/h/registry";

        await dispatchNotification({
          client: adminClient,
          recipientId: registry.registry_owner_id,
          recipientRole: "host",
          eventType: "order_status",
          message: `Your registry order ${orderCodeLabel} was ${statusLabel}.`,
          link: dashboardLink,
          data: {
            order_id: orderId,
            order_code: order?.order_code || null,
            registry_id: registry.id,
            status: newStatus,
          },
        });
      }
    }
  } catch (error) {
    console.error("Failed to send order status notifications:", error);
  }

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

  revalidatePath("/dashboard/admin/transactions");
  revalidatePath("/dashboard/admin");

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
  const adminClient = createAdminClient();

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
    .select("id, total_amount, status, order_code")
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

  try {
    const orderCodeLabel = order?.order_code || orderId?.slice(0, 8);
    const { data: orderItems } = await adminClient
      .from("order_items")
      .select("vendor_id")
      .eq("order_id", orderId);
    const vendorIds = Array.from(
      new Set(orderItems?.map((item) => item?.vendor_id).filter(Boolean))
    );

    if (vendorIds.length) {
      const { data: vendorRows } = await adminClient
        .from("vendors")
        .select("id, profiles_id")
        .in("id", vendorIds);

      for (const vendor of vendorRows || []) {
        if (!vendor?.profiles_id) continue;

        await dispatchNotification({
          client: adminClient,
          recipientId: vendor.profiles_id,
          recipientRole: "vendor",
          eventType: "order_status",
          message: `Refund initiated for order ${orderCodeLabel}.`,
          link: "/dashboard/v/orders",
          data: {
            order_id: orderId,
            order_code: order?.order_code || null,
            status: "refunded",
            vendor_id: vendor.id,
          },
          vendorId: vendor.id,
        });
      }
    }

    await dispatchToAdmins({
      client: adminClient,
      eventType: "dispute_or_refund",
      message: `Refund initiated for order ${orderCodeLabel}.`,
      link: "/dashboard/admin/transactions",
      data: {
        order_id: orderId,
        refund_id: refund.id,
      },
    });
  } catch (error) {
    console.error("Failed to send refund notifications:", error);
  }

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

  revalidatePath("/dashboard/admin/transactions");
  revalidatePath("/dashboard/admin");

  return {
    message: "Refund request initiated.",
    errors: {},
    values: {},
    data: { orderId, refundId: refund.id },
  };
}

// ─── Failed Delivery Management ──────────────────────────────────────────────

const deliveryActionSchema = z.object({
  orderId: z.string().uuid({ message: "Invalid order" }),
  reason: z.string().trim().optional().or(z.literal("")),
});

const deliveryAllowedRoles = [
  "super_admin",
  "operations_manager_admin",
  "customer_support_admin",
];

async function requireDeliveryAdmin(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !deliveryAllowedRoles.includes(profile.role)) {
    return { error: "You are not authorized for this action." };
  }
  return { user, profile };
}

export async function markDeliveryFailed(prevState, formData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const auth = await requireDeliveryAdmin(supabase);
  if (auth.error) {
    return { message: auth.error, errors: {}, values: {}, data: {} };
  }

  const raw = {
    orderId: formData.get("orderId"),
    reason: formData.get("reason") || "",
  };

  const parsed = deliveryActionSchema.safeParse(raw);
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
    .select("id, status, order_code, buyer_email")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return {
      message: orderError?.message || "Order not found.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  // Update delivery details
  const nowIso = new Date().toISOString();
  const { data: delivery } = await adminClient
    .from("order_delivery_details")
    .select("id, delivery_attempts")
    .eq("order_id", orderId)
    .maybeSingle();

  if (delivery) {
    await adminClient
      .from("order_delivery_details")
      .update({
        delivery_status: "failed",
        failed_delivery_reason: reason || null,
        failed_delivery_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", delivery.id);
  } else {
    await adminClient.from("order_delivery_details").insert({
      order_id: orderId,
      delivery_status: "failed",
      failed_delivery_reason: reason || null,
      failed_delivery_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });
  }

  // Update shipment status
  await adminClient
    .from("order_shipments")
    .update({ status: "failed", updated_at: nowIso, last_status_at: nowIso })
    .eq("order_id", orderId)
    .is("delivered_at", null);

  // Notify buyer
  try {
    const orderCodeLabel = order.order_code || orderId.slice(0, 8);

    if (order.buyer_email) {
      await adminClient.from("notification_email_queue").insert({
        recipient_email: order.buyer_email,
        template_slug: "delivery_failed",
        variables: {
          order_code: orderCodeLabel,
          reason: reason || "Delivery could not be completed.",
        },
        status: "pending",
      });
    }

    await dispatchToAdmins({
      client: adminClient,
      eventType: "system_alert",
      message: `Delivery failed for order ${orderCodeLabel}. Reason: ${reason || "Not specified"}`,
      link: "/dashboard/admin/transactions",
      data: { order_id: orderId, order_code: order.order_code || null },
    });
  } catch (err) {
    console.error("Failed delivery notification error:", err);
  }

  await logAdminActivityWithClient(supabase, {
    adminId: auth.profile.id,
    adminRole: auth.profile.role,
    adminEmail: auth.user.email || null,
    adminName: null,
    action: "marked_delivery_failed",
    entity: "orders",
    targetId: orderId,
    details: `Marked delivery failed for order ${orderId}. Reason: ${reason || "Not specified"}`,
  });

  revalidatePath("/dashboard/admin/transactions");
  return {
    message: "Delivery marked as failed.",
    errors: {},
    values: {},
    data: { orderId },
  };
}

export async function reattemptDelivery(prevState, formData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const auth = await requireDeliveryAdmin(supabase);
  if (auth.error) {
    return { message: auth.error, errors: {}, values: {}, data: {} };
  }

  const raw = { orderId: formData.get("orderId") };
  const parsed = z
    .object({ orderId: z.string().uuid({ message: "Invalid order" }) })
    .safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { orderId } = parsed.data;

  // Fetch order with shipping info
  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select(
      `id, order_code, status, total_amount, shipping_fee,
       buyer_firstname, buyer_lastname, buyer_email, buyer_phone,
       shipping_address, shipping_city, shipping_region,
       shipping_digital_address`
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return {
      message: orderError?.message || "Order not found.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  // Get vendor info from order items
  const { data: orderItems } = await adminClient
    .from("order_items")
    .select("vendor_id")
    .eq("order_id", orderId)
    .limit(1);

  const vendorId = orderItems?.[0]?.vendor_id;
  if (!vendorId) {
    return {
      message: "Could not determine vendor for this order.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  const { data: vendor } = await adminClient
    .from("vendors")
    .select(
      "business_name, phone, email, address_street, digital_address, address_city, address_state, address_country"
    )
    .eq("id", vendorId)
    .single();

  if (!vendor) {
    return {
      message: "Vendor not found.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  // Get checkout context for weight/pieces
  const { data: checkoutCtx } = await adminClient
    .from("checkout_context")
    .select("total_weight_kg, pieces")
    .eq("order_id", orderId)
    .maybeSingle();

  const totalWeight = Number(checkoutCtx?.total_weight_kg || 1);
  const totalPieces = Number(checkoutCtx?.pieces || 1);

  // Create new Aramex shipment
  const { createAramexShipment, buildAramexTrackingUrl } = await import(
    "../../../utils/shipping/aramex"
  );

  const consigneeName = [order.buyer_firstname, order.buyer_lastname]
    .filter(Boolean)
    .join(" ")
    .trim();

  let shipmentResult;
  try {
    shipmentResult = await createAramexShipment({
      shipper: {
        name: vendor.business_name || "Giftologi Vendor",
        company: vendor.business_name || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        address: vendor.address_street || "",
        address2: vendor.digital_address || "",
        city: vendor.address_city || "",
        state: vendor.address_state || "",
        postalCode: "",
        countryCode: vendor.address_country || "GH",
      },
      consignee: {
        name: consigneeName || "Recipient",
        company: "",
        phone: order.buyer_phone || "",
        email: order.buyer_email || "",
        address: order.shipping_address || "",
        address2: order.shipping_digital_address || "",
        city: order.shipping_city || "",
        state: order.shipping_region || "",
        postalCode: "",
        countryCode: vendor.address_country || "GH",
      },
      shipment: {
        weight: Math.max(1, totalWeight || totalPieces || 1),
        numberOfPieces: Math.max(1, totalPieces || 1),
        goodsValue: Number(order.total_amount || 0),
        currency: "GHS",
        description: `Re-attempt: Order ${order.order_code}`,
        originCountryCode: vendor.address_country || "GH",
      },
      reference: order.order_code,
    });
  } catch (err) {
    console.error("Aramex re-attempt shipment error:", err);
    return {
      message: "Failed to create new shipment with Aramex.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  if (shipmentResult.hasErrors || !shipmentResult.shipmentNumber) {
    return {
      message: `Aramex error: ${shipmentResult.message || "Shipment creation failed."}`,
      errors: {},
      values: raw,
      data: {},
    };
  }

  const nowIso = new Date().toISOString();
  const trackingUrl = buildAramexTrackingUrl(shipmentResult.shipmentNumber);

  // Insert new shipment record
  await adminClient.from("order_shipments").insert({
    order_id: orderId,
    provider: "aramex",
    status: "created",
    tracking_number: shipmentResult.shipmentNumber,
    tracking_url: trackingUrl,
    label_url: shipmentResult.labelUrl || null,
    shipment_reference: order.order_code,
    cost: order.shipping_fee || null,
    currency: "GHS",
    metadata: { source: "admin_reattempt" },
    last_status_at: nowIso,
  });

  // Update delivery details
  const { data: delivery } = await adminClient
    .from("order_delivery_details")
    .select("id, delivery_attempts")
    .eq("order_id", orderId)
    .maybeSingle();

  const newAttempts = (delivery?.delivery_attempts || 1) + 1;

  if (delivery) {
    await adminClient
      .from("order_delivery_details")
      .update({
        courier_partner: "aramex",
        tracking_id: shipmentResult.shipmentNumber,
        delivery_status: "created",
        delivery_attempts: newAttempts,
        failed_delivery_reason: null,
        failed_delivery_at: null,
        updated_at: nowIso,
      })
      .eq("id", delivery.id);
  } else {
    await adminClient.from("order_delivery_details").insert({
      order_id: orderId,
      courier_partner: "aramex",
      tracking_id: shipmentResult.shipmentNumber,
      delivery_status: "created",
      delivery_attempts: newAttempts,
      created_at: nowIso,
      updated_at: nowIso,
    });
  }

  // Set order back to shipped
  await adminClient
    .from("orders")
    .update({ status: "shipped", updated_at: nowIso })
    .eq("id", orderId);

  await adminClient
    .from("order_items")
    .update({ fulfillment_status: "shipped" })
    .eq("order_id", orderId);

  // Notify buyer
  try {
    if (order.buyer_email) {
      await adminClient.from("notification_email_queue").insert({
        recipient_email: order.buyer_email,
        template_slug: "delivery_reattempt",
        variables: {
          order_code: order.order_code || orderId.slice(0, 8),
          tracking_number: shipmentResult.shipmentNumber,
          tracking_url: trackingUrl,
        },
        status: "pending",
      });
    }
  } catch (err) {
    console.error("Re-attempt notification error:", err);
  }

  await logAdminActivityWithClient(supabase, {
    adminId: auth.profile.id,
    adminRole: auth.profile.role,
    adminEmail: auth.user.email || null,
    adminName: null,
    action: "reattempted_delivery",
    entity: "orders",
    targetId: orderId,
    details: `Re-attempted delivery for order ${orderId}. New tracking: ${shipmentResult.shipmentNumber}. Attempt #${newAttempts}`,
  });

  revalidatePath("/dashboard/admin/transactions");
  return {
    message: `Delivery re-attempted. New tracking: ${shipmentResult.shipmentNumber}`,
    errors: {},
    values: {},
    data: {
      orderId,
      trackingNumber: shipmentResult.shipmentNumber,
      trackingUrl,
      attempt: newAttempts,
    },
  };
}

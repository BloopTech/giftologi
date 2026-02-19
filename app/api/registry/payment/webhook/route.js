import { NextResponse } from "next/server";
import {
  createAdminClient,
} from "../../../../utils/supabase/server";
import { dispatchNotification } from "../../../../utils/notificationService";

const EXPRESSPAY_QUERY_URL =
  process.env.EXPRESSPAY_ENV === "live"
    ? "https://expresspaygh.com/api/query.php"
    : "https://sandbox.expresspaygh.com/api/query.php";

const EXPRESSPAY_MERCHANT_ID = process.env.EXPRESSPAY_MERCHANT_ID;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;

const TERMINAL_ORDER_STATUSES = new Set([
  "paid",
  "declined",
  "failed",
  "cancelled",
]);

function mapExpressPayResultToOrderStatus(resultCode, currentStatus = "pending") {
  const normalizedResult = Number(resultCode);

  if (normalizedResult === 1) return "paid";
  if (normalizedResult === 2) return "declined";
  if (normalizedResult === 3) return "failed";
  if (normalizedResult === 4) return "pending";

  return currentStatus;
}

export async function POST(request) {
  try {
    // ExpressPay sends form-urlencoded data
    const formData = await request.formData();
    const orderIdFromWebhook = formData.get("order-id");
    const tokenFromWebhook = formData.get("token");

    if (!orderIdFromWebhook && !tokenFromWebhook) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const adminClient = createAdminClient();

    // Find the order
    let order = null;

    if (orderIdFromWebhook) {
      const { data } = await adminClient
        .from("orders")
        .select("id, order_code, status, registry_id, payment_token")
        .eq("order_code", orderIdFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order && tokenFromWebhook) {
      const { data } = await adminClient
        .from("orders")
        .select("id, order_code, status, registry_id, payment_token")
        .eq("payment_token", tokenFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.error("Registry webhook order not found:", {
        orderId: orderIdFromWebhook,
      });
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Skip if already processed
    if (TERMINAL_ORDER_STATUSES.has(order.status)) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const queryToken = tokenFromWebhook || order.payment_token;
    if (!queryToken) {
      console.error("Registry webhook missing query token for order:", order.id);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Query ExpressPay for final transaction status
    const queryParams = new URLSearchParams({
      "merchant-id": EXPRESSPAY_MERCHANT_ID,
      "api-key": EXPRESSPAY_API_KEY,
      token: queryToken,
    });

    const queryResponse = await fetch(EXPRESSPAY_QUERY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: queryParams.toString(),
    });

    const queryData = await queryResponse.json();

    const newStatus = mapExpressPayResultToOrderStatus(
      queryData.result,
      order.status
    );
    const paymentReference =
      queryData["transaction-id"] || queryData.token || null;

    const updatePayload = {
      status: newStatus,
      payment_reference: paymentReference,
      payment_response: queryData,
      updated_at: new Date().toISOString(),
    };

    let paidTransitioned = false;
    if (newStatus === "paid") {
      const { data: updatedOrder, error: updateError } = await adminClient
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id)
        .neq("status", "paid")
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("Registry webhook order update failed:", updateError);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      paidTransitioned = Boolean(updatedOrder?.id);
    } else {
      const { error: updateError } = await adminClient
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id);

      if (updateError) {
        console.error("Registry webhook order update failed:", updateError);
      }
    }

    if (newStatus !== "paid" || !paidTransitioned) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // If payment was successful, update purchased quantity
    const { data: orderItems } = await adminClient
      .from("order_items")
      .select("registry_item_id, quantity")
      .eq("order_id", order.id);

    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        if (!item?.registry_item_id) continue;

        const { data: registryItem } = await adminClient
          .from("registry_items")
          .select("purchased_qty")
          .eq("id", item.registry_item_id)
          .maybeSingle();

        if (registryItem) {
          const newPurchasedQty =
            (registryItem.purchased_qty || 0) + item.quantity;

          await adminClient
            .from("registry_items")
            .update({
              purchased_qty: newPurchasedQty,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.registry_item_id);
        }
      }
    }

    try {
      if (order.registry_id) {
        const { data: registry } = await adminClient
          .from("registries")
          .select("id, registry_code, registry_owner_id, title")
          .eq("id", order.registry_id)
          .maybeSingle();

        if (registry?.registry_owner_id) {
          const { data: hostProfile } = await adminClient
            .from("profiles")
            .select("email, firstname")
            .eq("id", registry.registry_owner_id)
            .maybeSingle();

          const dashboardLink = registry.registry_code
            ? `/dashboard/h/registry/${registry.registry_code}`
            : "/dashboard/h/registry";

          await dispatchNotification({
            client: adminClient,
            recipientId: registry.registry_owner_id,
            recipientRole: "host",
            eventType: "registry_purchase",
            message: registry.title
              ? `New gift purchase for ${registry.title}.`
              : "You received a new registry purchase.",
            link: dashboardLink,
            data: {
              order_id: order.id,
              order_code: order.order_code || null,
              registry_id: registry.id,
              status: newStatus,
            },
            emailPayload: hostProfile?.email
              ? {
                  templateSlug: "host_purchase_alert",
                  to: hostProfile.email,
                  variables: {
                    host_name: hostProfile.firstname || "there",
                    buyer_name: "A gifter",
                    registry_title: registry.title || "your registry",
                    amount: "",
                    dashboard_url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}${dashboardLink}`,
                  },
                }
              : undefined,
          });
        }
      }
    } catch (error) {
      console.error(
        "Failed to send registry purchase notification:",
        error
      );
    }

    // ExpressPay expects HTTP 200 OK response
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Payment webhook error:", error);
    // Still return 200 to acknowledge receipt
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}

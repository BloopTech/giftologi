import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../utils/supabase/server";

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order-id");
    const token = searchParams.get("token");

    if (!orderId && !token) {
      return NextResponse.redirect(
        new URL("/payment-error?reason=missing_params", request.url)
      );
    }

    const adminClient = createAdminClient();

    // Find the order
    let order = null;
    let orderError = null;

    if (orderId) {
      const { data, error } = await adminClient
        .from("orders")
        .select(
          `
          id,
          order_code,
          registry_id,
          status,
          payment_token,
          payment_reference,
          registry:registries(
            registry_code
          )
        `
        )
        .eq("order_code", orderId)
        .maybeSingle();

      order = data;
      orderError = error;
    }

    if (!order && token) {
      const { data, error } = await adminClient
        .from("orders")
        .select(
          `
          id,
          order_code,
          registry_id,
          status,
          payment_token,
          payment_reference,
          registry:registries(
            registry_code
          )
        `
        )
        .eq("payment_token", token)
        .maybeSingle();

      order = data;
      orderError = error;
    }

    if (orderError || !order) {
      return NextResponse.redirect(
        new URL("/payment-error?reason=order_not_found", request.url)
      );
    }

    const orderCode = order.order_code || order.id;
    const registryCode = order.registry?.registry_code;
    const baseUrl = registryCode ? `/find-/registry/${registryCode}` : "/";

    if (TERMINAL_ORDER_STATUSES.has(order.status)) {
      if (order.status === "paid") {
        return NextResponse.redirect(
          new URL(`${baseUrl}?payment=success&order=${orderCode}`, request.url)
        );
      }

      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=failed&order=${orderCode}`, request.url)
      );
    }

    const queryToken = token || order.payment_token;
    if (!queryToken) {
      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=pending&order=${orderCode}`, request.url)
      );
    }

    // Query ExpressPay for transaction status
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

    // Update order status (idempotent)
    const { data: updatedOrder } = await adminClient
      .from("orders")
      .update({
        status: newStatus,
        payment_reference: paymentReference,
        payment_response: queryData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .neq("status", "paid")
      .select("id")
      .maybeSingle();

    // If payment was successful, update purchased quantity
    if (newStatus === "paid" && updatedOrder?.id) {
      // Get order items
      const { data: orderItems } = await adminClient
        .from("order_items")
        .select("registry_item_id, quantity")
        .eq("order_id", order.id);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (!item?.registry_item_id) continue;

          // Get current purchased qty
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
    }

    // Redirect based on status
    if (newStatus === "paid") {
      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=success&order=${orderCode}`, request.url)
      );
    } else if (newStatus === "pending") {
      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=pending&order=${orderCode}`, request.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=failed&order=${orderCode}`, request.url)
      );
    }
  } catch (error) {
    console.error("Payment callback error:", error);
    return NextResponse.redirect(
      new URL("/payment-error?reason=server_error", request.url)
    );
  }
}

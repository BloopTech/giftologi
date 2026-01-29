import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

const EXPRESSPAY_QUERY_URL =
  process.env.EXPRESSPAY_ENV === "live"
    ? "https://expresspaygh.com/api/query.php"
    : "https://sandbox.expresspaygh.com/api/query.php";

const EXPRESSPAY_MERCHANT_ID = process.env.EXPRESSPAY_MERCHANT_ID;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order-id");
    const token = searchParams.get("token");

    if (!orderId || !token) {
      return NextResponse.redirect(
        new URL("/payment-error?reason=missing_params", request.url)
      );
    }

    const supabase = await createClient();

    // Find the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_code,
        registry_id,
        status,
        payment_token,
        registry:registries(
          registry_code
        )
      `
      )
      .eq("order_code", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.redirect(
        new URL("/payment-error?reason=order_not_found", request.url)
      );
    }

    const orderCode = order.order_code || order.id;

    if (order.status === "paid") {
      const registryCode = order.registry?.registry_code;
      const baseUrl = registryCode ? `/registry/${registryCode}` : "/";
      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=success&order=${orderCode}`, request.url)
      );
    }

    // Query ExpressPay for transaction status
    const queryParams = new URLSearchParams({
      "merchant-id": EXPRESSPAY_MERCHANT_ID,
      "api-key": EXPRESSPAY_API_KEY,
      token,
    });

    const queryResponse = await fetch(EXPRESSPAY_QUERY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: queryParams.toString(),
    });

    const queryData = await queryResponse.json();

    // result: 1 = Approved, 2 = Declined, 3 = Error, 4 = Pending
    const resultStatus = queryData.result;

    let newStatus = "pending";
    if (resultStatus === 1) {
      newStatus = "paid";
    } else if (resultStatus === 2) {
      newStatus = "declined";
    } else if (resultStatus === 3) {
      newStatus = "failed";
    }

    // Update order status (idempotent)
    const { data: updatedOrder } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        payment_transaction_id: queryData["transaction-id"] || null,
        payment_result: queryData["result-text"] || null,
        payment_date: queryData["date-processed"] || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .neq("status", "paid")
      .select("id")
      .maybeSingle();

    // If payment was successful, update purchased quantity
    if (newStatus === "paid" && updatedOrder?.id) {
      // Get order items
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("registry_item_id, quantity")
        .eq("order_id", order.id);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          // Get current purchased qty
          const { data: registryItem } = await supabase
            .from("registry_items")
            .select("purchased_qty")
            .eq("id", item.registry_item_id)
            .single();

          if (registryItem) {
            const newPurchasedQty =
              (registryItem.purchased_qty || 0) + item.quantity;

            await supabase
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
    const registryCode = order.registry?.registry_code;
    const baseUrl = registryCode
      ? `/registry/${registryCode}`
      : "/";

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

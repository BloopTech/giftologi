import { NextResponse } from "next/server";
import {
  createAdminClient,
  createClient,
} from "../../../../utils/supabase/server";
import { createNotification } from "../../../../utils/notifications";

const EXPRESSPAY_QUERY_URL =
  process.env.EXPRESSPAY_ENV === "live"
    ? "https://expresspaygh.com/api/query.php"
    : "https://sandbox.expresspaygh.com/api/query.php";

const EXPRESSPAY_MERCHANT_ID = process.env.EXPRESSPAY_MERCHANT_ID;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;

export async function POST(request) {
  try {
    // ExpressPay sends form-urlencoded data
    const formData = await request.formData();
    const orderId = formData.get("order-id");
    const token = formData.get("token");

    if (!orderId || !token) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Find the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_code, status, registry_id")
      .eq("order_code", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found for webhook:", orderId);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Skip if already processed
    if (order.status === "paid" || order.status === "declined") {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Query ExpressPay for final transaction status
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

    // Update order status
    await supabase
      .from("orders")
      .update({
        status: newStatus,
        payment_transaction_id: queryData["transaction-id"] || null,
        payment_result: queryData["result-text"] || null,
        payment_date: queryData["date-processed"] || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // If payment was successful, update purchased quantity
    if (newStatus === "paid") {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("registry_item_id, quantity")
        .eq("order_id", order.id);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
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

      try {
        if (order.registry_id) {
          const { data: registry } = await adminClient
            .from("registries")
            .select("id, registry_code, registry_owner_id, title")
            .eq("id", order.registry_id)
            .maybeSingle();

          if (registry?.registry_owner_id) {
            await createNotification({
              client: adminClient,
              userId: registry.registry_owner_id,
              type: "registry_purchase",
              message: registry.title
                ? `New gift purchase for ${registry.title}.`
                : "You received a new registry purchase.",
              link: registry.registry_code
                ? `/dashboard/h/registry/${registry.registry_code}`
                : "/dashboard/h/registry",
              data: {
                order_id: order.id,
                order_code: order.order_code || null,
                registry_id: registry.id,
                status: newStatus,
              },
            });
          }
        }
      } catch (error) {
        console.error(
          "Failed to send registry purchase notification:",
          error
        );
      }
    }

    // ExpressPay expects HTTP 200 OK response
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Payment webhook error:", error);
    // Still return 200 to acknowledge receipt
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}

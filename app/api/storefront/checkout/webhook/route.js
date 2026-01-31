import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

const EXPRESSPAY_QUERY_URL =
  process.env.EXPRESSPAY_ENV === "live"
    ? "https://expresspaygh.com/api/query.php"
    : "https://sandbox.expresspaygh.com/api/query.php";

const EXPRESSPAY_MERCHANT_ID = process.env.EXPRESSPAY_MERCHANT_ID;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;

export async function POST(request) {
  try {
    const body = await request.formData();
    const token = body.get("token");
    const orderIdFromWebhook = body.get("order-id");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const supabase = await createClient();

    // Find order by token or order code
    let order = null;
    
    if (token) {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, status")
        .eq("payment_token", token)
        .single();
      order = data;
    }

    if (!order && orderIdFromWebhook) {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, status")
        .eq("order_code", orderIdFromWebhook)
        .single();
      order = data;
    }

    if (!order) {
      console.error("Order not found for token:", token);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Query ExpressPay for payment status
    const queryParams = new URLSearchParams({
      "merchant-id": EXPRESSPAY_MERCHANT_ID,
      "api-key": EXPRESSPAY_API_KEY,
      token: token,
    });

    const queryResponse = await fetch(EXPRESSPAY_QUERY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: queryParams.toString(),
    });

    const queryData = await queryResponse.json();

    // Determine order status based on ExpressPay response
    let newStatus = order.status;
    let paymentReference = null;

    if (queryData.result === 1) {
      newStatus = "paid";
      paymentReference = queryData["transaction-id"] || queryData.token;
    } else if (queryData.result === 2) {
      newStatus = "declined";
    } else if (queryData.result === 3) {
      newStatus = "failed";
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        payment_reference: paymentReference,
        payment_response: queryData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to update order:", updateError);
    }

    // If payment successful, update product stock and create payment record
    if (newStatus === "paid") {
      // Get order items
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", order.id);

      // Update stock for each product
      if (orderItems) {
        for (const item of orderItems) {
          // Get current stock and decrement
          const { data: product } = await supabase
            .from("products")
            .select("stock_qty")
            .eq("id", item.product_id)
            .single();

          if (product) {
            const newStock = Math.max(0, (product.stock_qty || 0) - item.quantity);
            await supabase
              .from("products")
              .update({ stock_qty: newStock, updated_at: new Date().toISOString() })
              .eq("id", item.product_id);
          }
        }
      }

      // Create payment record
      await supabase.from("order_payments").insert({
        order_id: order.id,
        amount: queryData.amount || 0,
        currency: queryData.currency || "GHS",
        payment_method: "expresspay",
        payment_reference: paymentReference,
        status: "completed",
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

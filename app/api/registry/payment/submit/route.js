import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "../../../../utils/supabase/server";
import { randomBytes } from "crypto";

const EXPRESSPAY_SUBMIT_URL =
  process.env.EXPRESSPAY_ENV === "live"
    ? "https://expresspaygh.com/api/submit.php"
    : "https://sandbox.expresspaygh.com/api/submit.php";

const EXPRESSPAY_MERCHANT_ID = process.env.EXPRESSPAY_MERCHANT_ID;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;

function generateOrderId() {
  return randomBytes(8).toString("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      registryId,
      registryItemId,
      productId,
      quantity = 1,
      amount,
      currency = "GHS",
      gifterInfo,
      message,
    } = body;

    if (!registryId || !registryItemId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // Verify registry and item exist
    const { data: registryItem, error: itemError } = await supabase
      .from("registry_items")
      .select(
        `
        id,
        quantity_needed,
        purchased_qty,
        registry:registries(
          id,
          title,
          registry_code
        ),
        product:products(
          id,
          name,
          price
        )
      `
      )
      .eq("id", registryItemId)
      .eq("registry_id", registryId)
      .single();

    if (itemError || !registryItem) {
      return NextResponse.json(
        { error: "Registry item not found" },
        { status: 404 }
      );
    }

    // Check if item is still available
    const remaining =
      (registryItem.quantity_needed || 0) - (registryItem.purchased_qty || 0);
    if (remaining < quantity) {
      return NextResponse.json(
        { error: "Requested quantity exceeds available quantity" },
        { status: 400 }
      );
    }

    // Generate unique order code
    const orderId = generateOrderId();

    // Get the base URL for redirects
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;
    const redirectUrl = `${origin}/api/registry/payment/callback`;
    const postUrl = `${origin}/api/registry/payment/webhook`;

    // Create pending order in database
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_code: orderId,
        registry_id: registryId,
        status: "pending",
        total_amount: amount,
        currency,
        gifter_firstname: gifterInfo?.firstName || null,
        gifter_lastname: gifterInfo?.lastName || null,
        gifter_email: gifterInfo?.email || null,
        gifter_phone: gifterInfo?.phone || null,
        gifter_anonymous: gifterInfo?.stayAnonymous || false,
        gifter_message: message || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order item
    const { error: orderItemError } = await supabaseAdmin.from("order_items").insert({
      order_id: order.id,
      registry_item_id: registryItemId,
      product_id: productId,
      quantity,
      price: amount,
      created_at: new Date().toISOString(),
    });

    if (orderItemError) {
      console.error("Order item creation error:", orderItemError);
    }

    // Prepare ExpressPay request
    const expressPayParams = new URLSearchParams({
      "merchant-id": EXPRESSPAY_MERCHANT_ID,
      "api-key": EXPRESSPAY_API_KEY,
      firstname: gifterInfo?.firstName || "Guest",
      lastname: gifterInfo?.lastName || "Gifter",
      email: gifterInfo?.email || `guest-${orderId}@giftologi.com`,
      phonenumber: gifterInfo?.phone || "",
      username: gifterInfo?.email || `guest-${orderId}@giftologi.com`,
      currency,
      amount: amount.toFixed(2),
      "order-id": orderId,
      "order-desc": `Gift purchase for ${registryItem.registry?.title || "Registry"}`,
      "redirect-url": redirectUrl,
      "post-url": postUrl,
    });

    // Submit to ExpressPay
    const expressPayResponse = await fetch(EXPRESSPAY_SUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: expressPayParams.toString(),
    });

    const expressPayData = await expressPayResponse.json();

    if (expressPayData.status !== 1) {
      // Update order status to failed
      await supabaseAdmin
        .from("orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", order.id);

      return NextResponse.json(
        {
          error: "Payment initialization failed",
          details: expressPayData.message || "Unknown error",
        },
        { status: 400 }
      );
    }

    // Store the token in the order
    await supabaseAdmin
      .from("orders")
      .update({
        payment_token: expressPayData.token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // Return checkout URL
    const checkoutUrl =
      process.env.EXPRESSPAY_ENV === "live"
        ? `https://expresspaygh.com/api/checkout.php?token=${expressPayData.token}`
        : `https://sandbox.expresspaygh.com/api/checkout.php?token=${expressPayData.token}`;

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderCode: orderId,
      token: expressPayData.token,
      checkoutUrl,
    });
  } catch (error) {
    console.error("Payment submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

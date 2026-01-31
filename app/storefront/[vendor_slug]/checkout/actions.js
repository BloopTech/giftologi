"use server";

import { createClient } from "../../../utils/supabase/server";
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

export async function processStorefrontCheckout(prevState, formData) {
  try {
    const vendorId = formData.get("vendorId");
    const vendorSlug = formData.get("vendorSlug");
    const productId = formData.get("productId");
    const quantity = parseInt(formData.get("quantity") || "1", 10);
    const subtotal = parseFloat(formData.get("subtotal") || "0");
    const shippingFee = parseFloat(formData.get("shippingFee") || "0");
    const shippingRegion = formData.get("shippingRegion");
    const total = parseFloat(formData.get("total") || "0");

    const firstName = formData.get("firstName")?.trim();
    const lastName = formData.get("lastName")?.trim();
    const email = formData.get("email")?.trim();
    const phone = formData.get("phone")?.trim();
    const address = formData.get("address")?.trim();
    const city = formData.get("city")?.trim();
    const region = formData.get("region");
    const digitalAddress = formData.get("digitalAddress")?.trim();
    const notes = formData.get("notes")?.trim();

    // Validation
    if (!firstName || !lastName || !email || !phone || !address || !city) {
      return { success: false, error: "Please fill in all required fields." };
    }

    if (!vendorId || !productId || !total) {
      return { success: false, error: "Invalid order data." };
    }

    const supabase = await createClient();

    // Verify product exists and has stock
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, stock_qty, vendor_id")
      .eq("id", productId)
      .eq("vendor_id", vendorId)
      .eq("status", "approved")
      .eq("active", true)
      .single();

    if (productError || !product) {
      return { success: false, error: "Product not found or unavailable." };
    }

    if (product.stock_qty < quantity) {
      return {
        success: false,
        error: `Only ${product.stock_qty} items available in stock.`,
      };
    }

    // Generate unique order code
    const orderId = generateOrderId();

    // Get the base URL for redirects
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://mygiftologi.com";
    const redirectUrl = `${origin}/storefront/${vendorSlug}/checkout/callback`;
    const postUrl = `${origin}/api/storefront/checkout/webhook`;

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_code: orderId,
        status: "pending",
        total_amount: total,
        currency: "GHS",
        buyer_firstname: firstName,
        buyer_lastname: lastName,
        buyer_email: email,
        buyer_phone: phone,
        shipping_address: address,
        shipping_city: city,
        shipping_region: shippingRegion,
        shipping_digital_address: digitalAddress,
        shipping_fee: shippingFee,
        delivery_notes: notes,
        order_type: "storefront",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return { success: false, error: "Failed to create order. Please try again." };
    }

    // Create order item
    const { error: orderItemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: productId,
      vendor_id: vendorId,
      quantity,
      price: product.price,
      total_price: subtotal,
      created_at: new Date().toISOString(),
    });

    if (orderItemError) {
      console.error("Order item creation error:", orderItemError);
    }

    // Prepare ExpressPay request
    const expressPayParams = new URLSearchParams({
      "merchant-id": EXPRESSPAY_MERCHANT_ID,
      "api-key": EXPRESSPAY_API_KEY,
      firstname: firstName,
      lastname: lastName,
      email: email,
      phonenumber: phone,
      username: email,
      currency: "GHS",
      amount: total.toFixed(2),
      "order-id": orderId,
      "order-desc": `Purchase from Giftologi - ${product.name}`,
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
      await supabase
        .from("orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", order.id);

      return {
        success: false,
        error: expressPayData.message || "Payment initialization failed. Please try again.",
      };
    }

    // Store the token in the order
    await supabase
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

    return {
      success: true,
      orderId: order.id,
      orderCode: orderId,
      token: expressPayData.token,
      checkoutUrl,
    };
  } catch (error) {
    console.error("Checkout error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

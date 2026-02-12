import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { order_code, email } = body;

    if (!order_code || !email) {
      return NextResponse.json(
        { error: "Order code and email are required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        `
        id,
        order_code,
        created_at,
        status,
        total_amount,
        currency,
        shipping_fee,
        buyer_firstname,
        buyer_lastname,
        buyer_email,
        buyer_phone,
        shipping_address,
        shipping_city,
        shipping_region,
        shipping_digital_address,
        delivery_notes,
        order_type,
        payment_method,
        payment_reference,
        gifter_firstname,
        gifter_lastname,
        gifter_email,
        gifter_phone,
        gift_message,
        promo_code,
        promo_discount
      `
      )
      .eq("order_code", order_code.trim())
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // Verify email matches buyer or gifter
    const buyerMatch = order.buyer_email?.toLowerCase() === normalizedEmail;
    const gifterMatch = order.gifter_email?.toLowerCase() === normalizedEmail;

    if (!buyerMatch && !gifterMatch) {
      return NextResponse.json(
        { error: "Email does not match the order." },
        { status: 403 }
      );
    }

    // Fetch order items
    const { data: items } = await admin
      .from("order_items")
      .select(
        `
        id,
        quantity,
        price,
        total_price,
        product:products(id, name, images),
        vendor:vendors(id, business_name)
      `
      )
      .eq("order_id", order.id);

    return NextResponse.json({
      order,
      items: Array.isArray(items) ? items : [],
    });
  } catch (err) {
    console.error("Order verify API error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

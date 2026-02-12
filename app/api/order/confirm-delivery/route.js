import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderCode, email } = body || {};

    if (!orderCode || !email) {
      return NextResponse.json(
        { error: "orderCode and email are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    if (!trimmedEmail) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Resolve order by order_code or id
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, status, buyer_email, gifter_email, order_code")
      .or(`order_code.eq.${orderCode},id.eq.${orderCode}`)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify email matches buyer or gifter
    const buyerEmail = (order.buyer_email || "").trim().toLowerCase();
    const gifterEmail = (order.gifter_email || "").trim().toLowerCase();
    if (trimmedEmail !== buyerEmail && trimmedEmail !== gifterEmail) {
      return NextResponse.json(
        { error: "Email does not match order records" },
        { status: 403 }
      );
    }

    // Check order is in a confirmable state
    const status = (order.status || "").toLowerCase();
    if (status === "cancelled" || status === "pending") {
      return NextResponse.json(
        { error: "This order cannot be confirmed in its current state" },
        { status: 400 }
      );
    }

    // Fetch delivery details
    const { data: delivery, error: deliveryError } = await admin
      .from("order_delivery_details")
      .select(
        "id, delivery_status, delivery_confirmed_at, delivery_attempts"
      )
      .eq("order_id", order.id)
      .maybeSingle();

    if (deliveryError) {
      return NextResponse.json(
        { error: "Failed to fetch delivery details" },
        { status: 500 }
      );
    }

    // If no delivery record exists, create a minimal one
    if (!delivery) {
      const { error: insertError } = await admin
        .from("order_delivery_details")
        .insert({
          order_id: order.id,
          delivery_status: "delivered",
          delivery_confirmed_at: new Date().toISOString(),
          delivery_confirmed_by: trimmedEmail,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to confirm delivery" },
          { status: 500 }
        );
      }
    } else {
      // Already confirmed?
      if (delivery.delivery_confirmed_at) {
        return NextResponse.json({
          success: true,
          alreadyConfirmed: true,
          message: "Delivery was already confirmed",
        });
      }

      // Update delivery details
      const { error: updateError } = await admin
        .from("order_delivery_details")
        .update({
          delivery_status: "delivered",
          delivery_confirmed_at: new Date().toISOString(),
          delivery_confirmed_by: trimmedEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to confirm delivery" },
          { status: 500 }
        );
      }
    }

    // Update order status to delivered if not already
    if (status !== "delivered") {
      await admin
        .from("orders")
        .update({
          status: "delivered",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // Also update order items
      await admin
        .from("order_items")
        .update({ fulfillment_status: "delivered" })
        .eq("order_id", order.id);
    }

    return NextResponse.json({
      success: true,
      message: "Delivery confirmed successfully",
    });
  } catch (error) {
    console.error("Confirm delivery error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

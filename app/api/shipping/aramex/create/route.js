import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../utils/supabase/server";
import {
  createAramexShipment,
  buildAramexTrackingUrl,
} from "../../../../utils/shipping/aramex";

const mapParty = ({
  name,
  company,
  phone,
  email,
  streetAddress,
  streetAddress2,
  city,
  stateProvince,
  postalCode,
  countryCode,
}) => ({
  name,
  company,
  phone,
  email,
  address: streetAddress,
  address2: streetAddress2,
  city,
  state: stateProvince,
  postalCode,
  countryCode,
});

export async function POST(request) {
  try {
    const payload = await request.json();
    const {
      orderId,
      shipper,
      consignee,
      shipment,
      reference,
    } = payload || {};

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    if (!shipper || !consignee) {
      return NextResponse.json(
        { error: "shipper and consignee details are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "paid") {
      return NextResponse.json(
        { error: "Order is not paid" },
        { status: 400 }
      );
    }

    const aramexResult = await createAramexShipment({
      shipper: mapParty(shipper),
      consignee: mapParty(consignee),
      shipment,
      reference,
    });

    if (aramexResult.hasErrors || !aramexResult.shipmentNumber) {
      return NextResponse.json(
        {
          error: "Aramex shipment creation failed",
          details: aramexResult.message || "Unknown error",
        },
        { status: 502 }
      );
    }

    const trackingUrl = buildAramexTrackingUrl(aramexResult.shipmentNumber);

    const { data: shipmentRow, error: shipmentError } = await admin
      .from("order_shipments")
      .insert({
        order_id: orderId,
        provider: "aramex",
        status: "created",
        tracking_number: aramexResult.shipmentNumber,
        tracking_url: trackingUrl,
        label_url: aramexResult.labelUrl || null,
        shipment_reference: reference || null,
        last_status_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (shipmentError) {
      return NextResponse.json(
        { error: "Failed to save shipment", details: shipmentError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shipmentId: shipmentRow.id,
      trackingNumber: aramexResult.shipmentNumber,
      trackingUrl,
      labelUrl: aramexResult.labelUrl || null,
    });
  } catch (error) {
    console.error("Aramex create shipment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

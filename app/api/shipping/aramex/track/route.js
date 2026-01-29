import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../utils/supabase/server";
import { trackAramexShipment } from "../../../../utils/shipping/aramex";

export async function POST(request) {
  try {
    const payload = await request.json();
    const { shipmentId, trackingNumber } = payload || {};

    if (!shipmentId && !trackingNumber) {
      return NextResponse.json(
        { error: "shipmentId or trackingNumber is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    let shipmentRow = null;
    if (shipmentId) {
      const { data, error } = await admin
        .from("order_shipments")
        .select("id, tracking_number, status")
        .eq("id", shipmentId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Shipment not found" },
          { status: 404 }
        );
      }
      shipmentRow = data;
    }

    const tracking = trackingNumber || shipmentRow?.tracking_number;
    if (!tracking) {
      return NextResponse.json(
        { error: "Tracking number missing" },
        { status: 400 }
      );
    }

    const trackingResult = await trackAramexShipment({ trackingNumber: tracking });

    const updatePayload = {
      status: trackingResult.description || shipmentRow?.status || "unknown",
      last_status_at: trackingResult.updateDate
        ? new Date(trackingResult.updateDate).toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let updatedRow = shipmentRow;
    if (shipmentRow?.id) {
      const { data, error } = await admin
        .from("order_shipments")
        .update(updatePayload)
        .eq("id", shipmentRow.id)
        .select("id, status, last_status_at")
        .single();

      if (!error && data) {
        updatedRow = data;
      }
    }

    return NextResponse.json({
      success: true,
      shipmentId: updatedRow?.id || shipmentId || null,
      trackingNumber: tracking,
      status: updatedRow?.status || trackingResult.description || "unknown",
      lastStatusAt: updatedRow?.last_status_at || null,
      raw: trackingResult.raw,
    });
  } catch (error) {
    console.error("Aramex track shipment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

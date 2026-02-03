import { NextResponse } from "next/server";
import { calculateAramexRate } from "../../../../utils/shipping/aramex";

export async function POST(request) {
  try {
    const payload = await request.json();
    const { origin, destination, shipment, reference } = payload || {};

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "origin and destination are required" },
        { status: 400 }
      );
    }

    const result = await calculateAramexRate({
      origin,
      destination,
      shipment,
      reference,
    });

    if (result.hasErrors || !Number.isFinite(result.totalAmount || 0)) {
      return NextResponse.json(
        {
          error: "Aramex rate lookup failed",
          details: result.message || "No rate returned",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      amount: result.totalAmount,
      currency: result.currency || "GHS",
      message: result.message || null,
    });
  } catch (error) {
    console.error("Aramex rate lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { queryExpressPayTransaction } from "../../../../utils/payments/expresspay";

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, token } = body;

    if (!orderId && !token) {
      return NextResponse.json(
        { error: "Order code or token is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find the order
    let order;
    if (orderId) {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_code, status, payment_token")
        .eq("id", orderId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }
      order = data;
    }

    const queryToken = token || order?.payment_token;

    if (!queryToken) {
      return NextResponse.json(
        { error: "No payment token available" },
        { status: 400 }
      );
    }

    const queryData = await queryExpressPayTransaction(queryToken);
    const normalizedResult = Number(queryData.result);

    // Map result to status
    const resultMap = {
      1: "approved",
      2: "declined",
      3: "error",
      4: "pending",
    };

    return NextResponse.json({
      success: true,
      result: normalizedResult,
      status: resultMap[normalizedResult] || "unknown",
      resultText: queryData["result-text"],
      transactionId: queryData["transaction-id"],
      amount: queryData.amount,
      currency: queryData.currency,
      dateProcessed: queryData["date-processed"],
    });
  } catch (error) {
    console.error("Payment query error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Query ExpressPay
    const queryParams = new URLSearchParams({
      "merchant-id": EXPRESSPAY_MERCHANT_ID,
      "api-key": EXPRESSPAY_API_KEY,
      token: queryToken,
    });

    const queryResponse = await fetch(EXPRESSPAY_QUERY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: queryParams.toString(),
    });

    const queryData = await queryResponse.json();

    // Map result to status
    const resultMap = {
      1: "approved",
      2: "declined",
      3: "error",
      4: "pending",
    };

    return NextResponse.json({
      success: true,
      result: queryData.result,
      status: resultMap[queryData.result] || "unknown",
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

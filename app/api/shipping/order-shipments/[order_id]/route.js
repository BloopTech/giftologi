import { NextResponse } from "next/server";
import { createClient as createSsrClient } from "../../../../utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const buildAnonClient = (orderId) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing Supabase anon configuration");
  }
  return createSupabaseClient(url, anonKey, {
    global: {
      headers: {
        "x-order-id": orderId,
      },
    },
  });
};

export async function GET(request, { params }) {
  try {
    const { order_id: orderId } = params || {};
    if (!orderId) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    }

    const supabase = await createSsrClient();
    const { data: authData } = await supabase.auth.getUser();
    const isAuthenticated = Boolean(authData?.user?.id);

    const client = isAuthenticated ? supabase : buildAnonClient(orderId);

    const { data, error } = await client
      .from("order_shipments")
      .select(
        "id, order_id, provider, status, tracking_number, tracking_url, label_url, shipment_reference, last_status_at, delivered_at"
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ success: true, shipments: data || [] });
  } catch (error) {
    console.error("Order shipments fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

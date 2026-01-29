import { NextResponse } from "next/server";
import {
  createClient as createSsrClient,
  createAdminClient,
} from "../../../../utils/supabase/server";
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

const resolveOrderId = async (admin, orderCode) => {
  const { data, error } = await admin
    .from("orders")
    .select("id")
    .or(`order_code.eq.${orderCode},id.eq.${orderCode}`)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id;
};

export async function GET(request, { params }) {
  try {
    const { order_id: orderCode } = await params || {};
    if (!orderCode) {
      return NextResponse.json(
        { error: "order_code is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const resolvedOrderId = await resolveOrderId(admin, orderCode);
    if (!resolvedOrderId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const supabase = await createSsrClient();
    const { data: authData } = await supabase.auth.getUser();
    const isAuthenticated = Boolean(authData?.user?.id);

    const client = isAuthenticated
      ? supabase
      : buildAnonClient(resolvedOrderId);

    const { data, error } = await client
      .from("order_shipments")
      .select(
        "id, order_id, provider, status, tracking_number, tracking_url, label_url, shipment_reference, last_status_at, delivered_at"
      )
      .eq("order_id", resolvedOrderId)
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

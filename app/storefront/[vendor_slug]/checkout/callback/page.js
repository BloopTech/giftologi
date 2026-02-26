"use server";
import React from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "../../../../utils/supabase/server";
import CallbackContent from "./content";

export default async function CheckoutCallbackPage({ params, searchParams }) {
  const { vendor_slug } = await params;
  const { token, "order-id": orderCode } = await searchParams;

  if (!token && !orderCode) {
    redirect("/");
  }

  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost || headerStore.get("host");
  const isLocalHost = (value) =>
    /(^|:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(
      String(value || "")
    );
  const protocol =
    headerStore.get("x-forwarded-proto") || (isLocalHost(host) ? "http" : "https");

  if (host && (token || orderCode)) {
    const webhookUrl = `${protocol}://${host}/api/storefront/checkout/webhook`;
    const formData = new FormData();
    if (token) formData.set("token", token);
    if (orderCode) formData.set("order-id", orderCode);

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const webhookPayload = await webhookResponse.json().catch(() => ({}));
      const webhookOutcome = String(webhookPayload?.outcome || "unknown");

      if (!webhookResponse.ok || webhookOutcome === "error") {
        console.error("Storefront callback webhook sync failed:", {
          ok: webhookResponse.ok,
          outcome: webhookOutcome,
          stage: webhookPayload?.stage || null,
        });
      }
    } catch (error) {
      console.error("Failed to sync payment status from callback:", error);
    }
  }

  const adminClient = createAdminClient();

  // Find order by token or order code
  let order = null;
  let vendor = null;
  const orderSelect = `
    id,
    order_code,
    status,
    total_amount,
    currency,
    buyer_firstname,
    buyer_email,
    payment_token,
    order_items(
      product:products(
        vendor:vendors(slug, business_name)
      )
    )
  `;

  if (token) {
    const { data } = await adminClient
      .from("orders")
      .select(orderSelect)
      .eq("payment_token", token)
      .maybeSingle();
    order = data;
  }

  if (!order && orderCode) {
    const { data } = await adminClient
      .from("orders")
      .select(orderSelect)
      .eq("order_code", orderCode)
      .maybeSingle();
    order = data;
  }

  if (order?.id && token && order.payment_token !== token) {
    await adminClient
      .from("orders")
      .update({ payment_token: token, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    order.payment_token = token;
  }

  if (order?.order_items?.[0]?.product?.vendor) {
    vendor = order.order_items[0].product.vendor;
  }

  return <CallbackContent order={order} vendor={vendor} />;
}

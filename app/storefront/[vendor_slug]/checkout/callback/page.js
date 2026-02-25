"use server";
import React from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "../../../../utils/supabase/server";
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
  const protocol = headerStore.get("x-forwarded-proto") || "https";

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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextParams = new URLSearchParams();
    if (token) nextParams.set("token", token);
    if (orderCode) nextParams.set("order-id", orderCode);
    const next = `/storefront/${vendor_slug}/checkout/callback?${nextParams.toString()}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // Find order by token or order code
  let order = null;
  let vendor = null;

  if (token) {
    const { data } = await supabase
      .from("orders")
      .select(`
        id,
        order_code,
        status,
        total_amount,
        currency,
        buyer_firstname,
        buyer_email,
        order_items(
          product:products(
            vendor:vendors(slug, business_name)
          )
        )
      `)
      .eq("payment_token", token)
      .single();
    order = data;
  } else if (orderCode) {
    const { data } = await supabase
      .from("orders")
      .select(`
        id,
        order_code,
        status,
        total_amount,
        currency,
        buyer_firstname,
        buyer_email,
        order_items(
          product:products(
            vendor:vendors(slug, business_name)
          )
        )
      `)
      .eq("order_code", orderCode)
      .single();
    order = data;
  }

  if (order?.order_items?.[0]?.product?.vendor) {
    vendor = order.order_items[0].product.vendor;
  }

  return <CallbackContent order={order} vendor={vendor} />;
}

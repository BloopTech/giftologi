"use server";
import React from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "../../../utils/supabase/server";
import ShopCallbackContent from "./content";

export default async function ShopCheckoutCallbackPage({ searchParams }) {
  const { token, "order-id": orderCode } = await searchParams;

  if (!token && !orderCode) {
    redirect("/shop");
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
        console.error("Shop callback webhook sync failed:", {
          ok: webhookResponse.ok,
          outcome: webhookOutcome,
          stage: webhookPayload?.stage || null,
        });
      }
    } catch (error) {
      console.error("Failed to sync shop payment status from callback:", error);
    }
  }

  const supabase = await createClient();

  let order = null;

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
        buyer_email
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
        buyer_email
      `)
      .eq("order_code", orderCode)
      .single();
    order = data;
  }

  return <ShopCallbackContent order={order} />;
}

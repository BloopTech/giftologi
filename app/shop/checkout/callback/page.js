"use server";
import React from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "../../../utils/supabase/server";
import ShopCallbackContent from "./content";

export default async function ShopCheckoutCallbackPage({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const token = resolvedSearchParams.token;
  const orderCode = resolvedSearchParams["order-id"];

  if (!token && !orderCode) {
    redirect("/shop");
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
    Object.entries(resolvedSearchParams).forEach(([key, rawValue]) => {
      if (Array.isArray(rawValue)) {
        rawValue.forEach((value) => {
          if (value === null || typeof value === "undefined") return;
          formData.append(key, String(value));
        });
        return;
      }

      if (rawValue === null || typeof rawValue === "undefined") return;
      formData.set(key, String(rawValue));
    });

    if (token && !formData.get("token")) formData.set("token", token);
    if (orderCode && !formData.get("order-id")) formData.set("order-id", orderCode);

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

  const adminClient = createAdminClient();

  let order = null;
  const orderSelect = `
    id,
    order_code,
    status,
    total_amount,
    currency,
    buyer_firstname,
    buyer_email,
    payment_token
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

  return <ShopCallbackContent order={order} />;
}

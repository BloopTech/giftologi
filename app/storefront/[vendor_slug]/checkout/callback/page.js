"use server";
import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "../../../../utils/supabase/server";
import CallbackContent from "./content";

export default async function CheckoutCallbackPage({ params, searchParams }) {
  const { vendor_slug } = await params;
  const { token, "order-id": orderCode } = await searchParams;

  if (!token && !orderCode) {
    redirect("/");
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

"use server";
import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
import ShopCallbackContent from "./content";

export default async function ShopCheckoutCallbackPage({ searchParams }) {
  const { token, "order-id": orderCode } = await searchParams;

  if (!token && !orderCode) {
    redirect("/shop");
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

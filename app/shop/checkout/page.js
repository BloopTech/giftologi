"use server";
import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import ShopCheckoutContent from "./content";
import { createMetadata } from "../../utils/seo";

export async function generateMetadata() {
  return createMetadata({
    title: "Checkout - Giftologi Shop",
    description: "Complete your purchase from the Giftologi Gift Shop. Secure checkout with ExpressPay.",
    noIndex: true,
  });
}

export default async function ShopCheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile for prefilling contact & shipping (guests get null)
  let userProfile = null;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("firstname, lastname, email, phone, address_street, address_city, address_state, digital_address")
      .eq("id", user.id)
      .single();
    userProfile = profile;
  }

  return <ShopCheckoutContent userProfile={userProfile} />;
}

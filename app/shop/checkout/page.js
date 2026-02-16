"use server";
import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#shop-checkout-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to checkout form
      </Link>
      <main id="shop-checkout-content" role="main" aria-label="Shop checkout">
        <ShopCheckoutContent userProfile={userProfile} />
      </main>
    </>
  );
}

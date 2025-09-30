"use server";
import React from "react";
import { createClient } from "../../../utils/supabase/server";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  return (
    <div className="dark:text-white bg-[#FFFFFF] dark:bg-gray-950 lg:pl-10 pl-5 pr-5 lg:pr-0">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#2D3436] dark:text-white">Analytics</h1>
          <p className="text-sm text-[#6B7280] dark:text-gray-300">User behavior, sales performance, and product insights.</p>
        </div>
        <div role="region" aria-label="Analytics" className="rounded-xl border border-[#f4f4f4] dark:border-gray-800 bg-[#FFFCEF] dark:bg-gray-900 p-6">
          <p className="text-sm text-[#6B7280] dark:text-gray-300">Analytics widgets coming soon.</p>
        </div>
      </div>
    </div>
  );
}

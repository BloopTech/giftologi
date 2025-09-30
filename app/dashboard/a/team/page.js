"use server";
import React from "react";
import { createClient } from "../../../utils/supabase/server";

export default async function AdminTeamPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  return (
    <div className="dark:text-white bg-[#FFFFFF] dark:bg-gray-950 lg:pl-10 pl-5 pr-5 lg:pr-0">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#2D3436] dark:text-white">Team</h1>
          <p className="text-sm text-[#6B7280] dark:text-gray-300">Add and manage admin team members.</p>
        </div>
        <div role="region" aria-label="Team" className="rounded-xl border border-[#f4f4f4] dark:border-gray-800 bg-[#FFFCEF] dark:bg-gray-900 p-6">
          <p className="text-sm text-[#6B7280] dark:text-gray-300">Team management coming soon.</p>
        </div>
      </div>
    </div>
  );
}

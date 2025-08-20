"use server";
import React from "react";
import { createClient } from "../../../utils/supabase/server";

export default async function AdminProfile() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  return (
    <div className="dark:text-white bg-[#FFFFFF] dark:bg-gray-950 lg:pl-10 pl-5 pr-5 lg:pr-0">
      <p className="capitalize">
        {profile?.role} Dashboard {profile?.firstname}
      </p>
    </div>
  );
}
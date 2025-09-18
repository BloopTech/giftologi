"use server";
import React from "react";
import { createClient } from "../../utils/supabase/server";
import { PiFileImageLight } from "react-icons/pi";

export default async function HostDashboard() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  return (
    <div className="dark:text-white bg-[#FAFAFA] dark:bg-gray-950 lg:px-10 px-5 w-full font-poppins">
      {/* <p className="capitalize">
        {profile?.role} Dashboard {profile?.firstname}
      </p> */}
      <main className="flex flex-col space-y-8 w-full">
        <div className="w-full bg-[#E9E9ED] border border-[#D4D4D4] rounded-md py-8 px-4 h-[250px] flex items-center justify-center">
          <div className="flex items-center space-y-8 flex-col justify-center">
            <PiFileImageLight className="size-14" />
            <button className="text-white cursor-pointer text-xs/tight bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-2xl px-4 py-2 flex items-center">
              Add a Cover Photo
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col space-y-4">
          <p className="text-[#394B71]">Registry Summary</p>
          <div className="w-full flex space-x-4 flex-wrap">
            <div className="w-[300px] flex flex-col space-y-2 border border-[#DCDCDE] rounded-md p-4 bg-white">
              <p className="text-xs text-[#394B71]">Event Name</p>
              <p className="text-sm text-[#247ACB] font-semibold">Kwame & Fey&apos;s Baby Shower</p>
              <p className="text-xs text-[#B3B3B3]">Sep 30, 2025</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

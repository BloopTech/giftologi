"use server";
import React from "react";
import { createClient } from "../../../utils/supabase/server";
import { PiFileImageLight, PiGiftDuotone, PiShareBold } from "react-icons/pi";
import Image from "next/image";
import Link from "next/link";
import Footer from "../../../components/footer";
import Advertisement from "../../../components/advertisement";

export default async function HostDashboardRegistry() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-6xl w-full font-brasley-medium min-h-screen">
      {/* <p className="capitalize">
        {profile?.role} Dashboard {profile?.firstname}
      </p> */}
      <main className="flex flex-col space-y-16 w-full">
        <div className="w-full bg-[#E9E9ED] border border-[#D4D4D4] rounded-md py-8 px-4 h-[250px] flex items-center justify-center">
          <div className="flex items-center space-y-8 flex-col justify-center">
            <PiFileImageLight className="size-14" />
            <button className="text-white cursor-pointer text-xs/tight bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-2xl px-4 py-2 flex items-center">
              Add a Cover Photo
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col space-y-4">
          <p className="text-[#394B71] font-semibold">Registry Summary</p>
          <div className="w-full flex space-x-4 flex-wrap">
            <div className="w-[250px] flex flex-col space-y-2 border border-[#DCDCDE] rounded-md p-4 bg-white">
              <p className="text-xs text-[#394B71]">Event Name</p>
              <p className="text-sm text-[#247ACB] font-semibold line-clamp-1 w-full">
                Kwame & Fey&apos;s Baby Shower
              </p>
              <p className="text-xs text-[#B3B3B3]">Sep 30, 2025</p>
            </div>
            <div className="flex items-start justify-center space-x-2 border border-[#DCDCDE] rounded-md p-4 bg-white">
              <PiGiftDuotone className="size-18 text-[#247ACB]" />
              <div className="flex flex-col space-y-2">
                <p className="text-4xl text-[#247ACA] font-semibold">0</p>
                <p className="text-xs text-[#939393]">items</p>
              </div>
            </div>
            <div className="flex items-center flex-col justify-center space-y-2 border border-[#8DC76C] rounded-md py-4 px-8 bg-[#EBF9E3]">
              <PiShareBold className="size-10 text-[#5CAE2D] font-semibold" />

              <p className="text-xs text-[#5CAE2D]">Share Registry</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center mx-auto max-w-md w-full rounded-4xl border border-[#A9C4FC] px-4 py-8 bg-white flex-col space-y-4">
          <div className="inline-block">
            <Image
              src="/host/open-gift.svg"
              alt="open gift"
              width={100}
              height={100}
              className="object-contain"
              priority
            />
          </div>
          <p className="text-[#394B71] font-semibold text-center text-sm">
            Your registry is empty.
            <br /> Add items from the Shop to get started.
          </p>
          <button className="text-white cursor-pointer text-xs/tight bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-2xl px-4 py-2 flex items-center">
            Go to Shop
          </button>
        </div>

        <Advertisement />

        <Footer />
      </main>
    </div>
  );
}
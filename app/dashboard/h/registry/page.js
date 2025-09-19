"use server";
import React from "react";
import { createClient } from "../../../utils/supabase/server";
import {
  PiFileImageLight,
  PiGiftDuotone,
  PiGiftFill,
  PiShareBold,
} from "react-icons/pi";
import Image from "next/image";
import Link from "next/link";
import Footer from "../components/footer";
import Advertisement from "../components/advertisement";
import { CircleChevronDown, ShoppingCart } from "lucide-react";

export default async function HostDashboardRegistry() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  // Mock 20 products to render in the Shop section
  const products = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    title: `MOMCOZY KleanPal Pro Baby Bottle Washer #${i + 1}`,
    image: "/host/toaster.png",
    price: "GHS 300.20",
    desired: 1,
    purchased: 0
  }));

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-poppins min-h-screen">
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
                <p className="text-4xl text-[#247ACA] font-semibold">1</p>
                <p className="text-xs text-[#939393]">items</p>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-4 rounded-md py-4 px-4 bg-white border border-[#DCDCDE]">
              <ShoppingCart className="size-12 text-[#247ACA] font-semibold" />

              <div>
                <p className="text-xs text-[#939393] ">
                  <span className="text-2xl text-[#939393]">
                    <span className="font-semibold text-[#247ACA]">0</span>/1{" "}
                  </span>{" "}
                  products purchased
                </p>
              </div>
            </div>
            <div className="flex items-center flex-col justify-center space-y-2 border border-[#8DC76C] rounded-md py-4 px-8 bg-[#EBF9E3]">
              <PiShareBold className="size-10 text-[#5CAE2D] font-semibold" />

              <p className="text-xs text-[#5CAE2D]">Share Registry</p>
            </div>
            <div className="flex items-center flex-col justify-center space-y-2 border border-[#B1C6F2] rounded-md py-4 px-8 bg-[#D3E4F5]">
              <PiGiftFill className="size-10 text-[#247ACB] font-semibold" />

              <p className="text-xs text-[#247ACB]">+ Add Gift</p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col space-y-4">
          <p className="text-[#394B71] font-semibold">View Products</p>
          <div className="flex bg-white rounded-lg flex-col space-y-4 p-4 w-[200px]">
            <div className="flex items-center justify-center">
              <Image
                src="/host/toaster.png"
                alt="toaster"
                width={150}
                height={150}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col space-y-2 w-full">
              <p className="text-sm font-semibold text-black line-clamp-2 w-full">
                MOMCOZY KleanPal Pro Baby Bottle Washer
              </p>
              <div className="flex items-center w-full justify-between">
                <p className="text-xs text-[#939393]">Desired 1</p>
                <p className="text-xs text-[#939393]">Purchased 0</p>
              </div>
              <div className="flex items-center w-full justify-between">
                <p className="text-xs text-[#939393]">GHS 300.20</p>
                <button className="text-xs text-white cursor-pointer bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-l-xl px-2 py-1 flex items-center">
                  View Product
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full rounded-3xl border border-[#DCDCDE] p-4 bg-white flex flex-col space-y-4">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-[#394B71] text-2xl font-bold">Shop</h1>
            <div className="flex justify-end items-center space-x-2">
              <button className="text-[#A5914B] cursor-pointer text-sm/tight px-4 py-2 flex items-center">
                Gift Category{" "}
                <CircleChevronDown className="fill-[#A5914B] text-white size-6 font-bold" />
              </button>
              <button className="text-[#A5914B] cursor-pointer text-sm/tight px-4 py-2 flex items-center">
                Sort By{" "}
                <CircleChevronDown className="fill-[#A5914B] text-white size-6 font-bold" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((p) => (
              <div key={p.id} className="flex bg-white rounded-lg flex-col space-y-4 p-4 w-full">
                <div className="flex items-center justify-center">
                  <Image
                    src={p.image}
                    alt={p.title}
                    width={150}
                    height={150}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col space-y-2 w-full">
                  <p className="text-sm font-semibold text-black line-clamp-2 w-full">{p.title}</p>
                  <div className="flex items-center w-full justify-between">
                    <p className="text-xs text-[#939393]">Desired {p.desired}</p>
                    <p className="text-xs text-[#939393]">Purchased {p.purchased}</p>
                  </div>
                  <div className="flex items-center w-full justify-between">
                    <p className="text-xs text-[#939393]">{p.price}</p>
                    <button className="text-xs text-white cursor-pointer bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-l-xl px-2 py-1 flex items-center">
                      View Product
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Advertisement />

        <Footer />
      </main>
    </div>
  );
}

"use client";
import React from "react";
import { PiFileImageLight, PiGiftDuotone, PiGiftFill } from "react-icons/pi";
import Image from "next/image";
import Link from "next/link";
import Footer from "../../components/footer";
import Advertisement from "../../components/advertisement";
import { CircleChevronDown, ShoppingCart } from "lucide-react";


export default function EventPageContent(props) {


  // Mock 20 products to render in the Shop section
  const products = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    title: `MOMCOZY KleanPal Pro Baby Bottle Washer #${i + 1}`,
    image: "/host/toaster.png",
    price: "GHS 300.20",
    desired: 1,
    purchased: 0,
  }));

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-poppins min-h-screen">
      <main className="flex flex-col space-y-16 w-full">
        <div className="w-full bg-[#B1D1FC] border border-[#D4D4D4] rounded-md py-8 px-4 h-[250px] flex items-center justify-center">
          {/* <div className="flex items-center space-y-8 flex-col justify-center">
            <PiFileImageLight className="size-14" />
            <button className="text-white cursor-pointer text-xs/tight bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-2xl px-4 py-2 flex items-center">
              Add a Cover Photo
            </button>
          </div> */}
        </div>

        <div className="w-full rounded-3xl border border-[#DCDCDE] p-4 bg-white flex flex-col space-y-4">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-[#394B71] text-2xl font-bold">Registry</h1>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p, index) => {
              const odd = index % 2 === 0;

              return (
                <div
                  key={p.id}
                  className={`flex bg-white rounded-lg flex-col space-y-4 py-4 w-full border ${
                    odd ? " border-[#8DC76C]" : "border-[#F6E9B7]"
                  }`}
                >
                  <div className="flex items-center justify-center px-4">
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
                    <p className="text-sm font-semibold text-black line-clamp-2 w-full px-4">
                      {p.title}
                    </p>
                    <div className="flex items-center w-full justify-between px-4">
                      <p className="text-xs text-[#939393]">Desired 1</p>
                      <p className="text-xs text-[#939393]">Purchased 1</p>
                    </div>
                    <div className="flex items-center w-full justify-between">
                      <p className="text-xs text-[#939393] pl-4">{p.price}</p>
                      <div className={odd ? "hidden" : "flex pr-4"}>
                        <button className="text-xs text-white cursor-pointer bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-xl px-4 py-1 flex items-center">
                          Buy Gift
                        </button>
                      </div>
                      <div className={odd ? "flex" : "hidden"}>
                        <p className="text-xs text-white bg-[#8DC76C] border border-[#8DC76C] rounded-l-xl px-2 py-1 flex items-center">
                          Purchased
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Advertisement />

        <Footer />
      </main>
    </div>
  );
}

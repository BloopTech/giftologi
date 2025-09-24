"use client";
import React from "react";

export default function Advertisement() {
  return (
    <div
      style={{
        backgroundColor: "#247ACB",
        backgroundImage: "url('/host/advertisement.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100%",
        height: "100%",
      }}
      className="rounded-xl"
    >
      <div className="w-full max-w-md h-full flex flex-col space-y-8 p-8 text-white">
        <p className="text-2xl font-semibold">SAMSUNG</p>
        <div className="flex flex-col space-y-2">
          <p className="text-xl font-semibold">Unheard of performance</p>
          <p className="text-xs">
            Introducing the new Q990C, our greatest-of-all-time soundbar,
            delivering level audio synchronized to your TV&apos;s sound.
          </p>
        </div>
        <button className="w-fit text-white cursor-pointer text-xs/tight bg-[#497AD1] border border-[#497AD1] hover:bg-white hover:text-[#497AD1] rounded-2xl px-4 py-2 flex items-center">
          View all products
        </button>
      </div>
    </div>
  );
}

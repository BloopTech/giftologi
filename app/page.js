"use client";
import React from "react";
import { Mail } from "lucide-react";
import Image from "next/image";
import Logo from "../public/logo-gold.png";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-[#16150FB2] text-black flex flex-col min-h-screen gap-16 pt-5 px-10 w-full items-center justify-center"
    style={{
      backgroundImage: "url('/coming_soon_layer.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
    >
      <main className="flex flex-col items-center justify-center w-full">
        <div className="gift-card rounded-2xl relative overflow-hidden p-8 max-w-md mx-auto bg-white flex items-center space-x-8 justify-center fade-in-up delay-3 border border-slate-400 font-poppins">
          <div className="pointer-events-none absolute top-0 right-0 w-[113px] h-[115px] overflow-hidden z-0" aria-hidden="true">
            <div className="absolute top-0 right-0 w-[260px] h-[14px] bg-[#D2BF7C] origin-top-right -translate-y-1/2 rotate-45" />
          </div>
          <div className="relative z-10">
            <Image src={Logo} alt="Logo" width={120} height={120} />
          </div>
          <div className="relative z-10 flex flex-col space-y-4 w-full">
            <p className="text-[#85753C] font-semibold">
              Hold the ribbon,
              <br />
              we&apos;re tying the knot on our site.
            </p>
            <p className="text-xs text-[#85753C]">
              We&apos;re handpicking every detail, just for you. Sit
              tight—we&apos;ll be live soon.
            </p>
            <div className="flex space-x-4 w-full">
              <Link
                href="mailto:devs@mygiftologi.com"
                className="rounded-xl flex items-center justify-center px-4 py-2 bg-[#A5914B] text-xs text-white"
                aria-label="Send us an email"
              >
                Send us an Email
              </Link>
              <Link
                href="tel:+233244151619"
                className="rounded-xl flex items-center justify-center px-8 py-2 bg-[#85753C] text-xs text-white"
                aria-label="Call us at +233244151619"
              >
                Call Us
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

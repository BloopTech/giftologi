"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HeroV3() {
  const router = useRouter();

  return (
    <section className="relative h-screen min-h-[850px] flex items-center bg-[#FDFCF8] overflow-hidden">
      {/* Split Layout: Image on Right, Content on Left */}
      <div className="absolute inset-0 z-0 flex flex-col lg:flex-row">
        {/* Content Side Background */}
        <div className="w-full lg:w-1/2 h-full bg-[#FCFAF2]"></div>

        {/* Image Side */}
        <div className="w-full lg:w-1/2 h-full relative">
          <Image
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2000"
            alt="High-end Event"
            className="object-cover"
            priority
            sizes="100vw"
            fill
          />
          {/* Soft overlap gradient to blend with the left side */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#FCFAF2] to-transparent hidden lg:block"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="max-w-xl">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-px w-12 bg-[#FDD17D]"></div>
            <span className="text-black font-didot-bold uppercase text-md tracking-wide">
              Giftologi
            </span>
          </div>

          <h1 className="text-6xl md:text-[6.5rem] font-didot-bold font-bold text-gray-900 mb-8 leading-[1] tracking-tighter">
            The Art of <br />
            <span className="text-[#FDD17D] font-light italic">Receiving.</span>
          </h1>

          <p className="text-gray-600 font-brasley-medium text-xl leading-relaxed mb-12 max-w-md border-l-2 border-[#FDD17D]/20 pl-8">
            Experience the new standard in curated registries. Designed for the
            discerning eye and the intentional heart.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 pt-4">
            <button
              className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gray-900 rounded-full text-white px-12 py-5 font-brasley-semibold text-sm uppercase tracking-[0.2em] font-bold hover:bg-[#FDD17D] hover:text-gray-900 transition-all duration-500 shadow-2xl"
              onClick={() => router.push("/login")}
            >
              Create Registry
            </button>
            <Link
              href="/find-registry"
              className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 rounded-full px-12 py-5 font-brasley-medium text-sm uppercase tracking-[0.2em] font-bold border border-gray-200 hover:border-[#FDD17D] transition-all duration-500"
            >
              The Collection
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-12 left-12 flex flex-col items-center space-y-4">
        <div className="w-[1px] h-24 bg-gradient-to-b from-[#FDD17D] to-transparent"></div>
        <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-[#FDD17D] [writing-mode:vertical-lr]">
          Scroll
        </span>
      </div>
    </section>
  );
}

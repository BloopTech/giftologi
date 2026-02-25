"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function VendorCTA() {
  return (
    <section className="pt-16 pb-32 px-6 sm:px-12 lg:px-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* Left: Text Content - 5/12 columns */}
          <div className="lg:col-span-5 space-y-10">
            <div className="space-y-4">
              <h4 className="text-[13px] font-bold tracking-[0.4em] text-[#FF6581] uppercase">
                Partner With Us
              </h4>
              <h2 className="text-5xl md:text-7xl font-bold text-gray-900 leading-[1.1]">
                Empower Your <br />
                <span className="italic font-light">Heritage Brand.</span>
              </h2>
            </div>

            <p className="text-xl text-gray-500 font-light leading-relaxed max-w-md">
              Join our exclusive network of world-class vendors. Reach a curated
              audience of intentional gift-givers and celebrate life&apos;s
              finest moments.
            </p>

            <div className="pt-6">
              <Link
                href="/vendor"
                className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#FDD17D] text-gray-900 px-12 py-6 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-900 hover:text-white transition-all duration-500 shadow-xl hover:shadow-2xl"
              >
                Become a Vendor
              </Link>
            </div>
          </div>

          {/* Right: Premium Imagery - 7/12 columns */}
          <div className="lg:col-span-7 relative">
            <div className="aspect-[16/10] rounded-[4rem] overflow-hidden shadow-2xl relative">
              <Image
                src="/registry-wedding.png"
                alt="Vendor Partnership"
                className="object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-1000"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>

            {/* Floating Metric */}
            <div className="absolute -bottom-8 -right-8 bg-[#f5f0e8] border border-[#e8dfc8] p-8 shadow-xl max-w-[240px] transform rotate-[2deg] rounded-sm flex flex-col items-center justify-center min-h-[140px] z-10">
              <span className="block text-4xl font-handwriting text-gray-800 mb-2 font-bold select-none">
                500k+
              </span>
              <p className="text-lg font-handwriting text-gray-800 leading-snug text-center">
                Active registries waiting for your products.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

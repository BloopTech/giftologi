"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CallToAction() {
  const router = useRouter();

  return (
    <section className="py-44 px-6 sm:px-12 lg:px-24 bg-[#F9F9F9] relative overflow-hidden">
      {/* Background Texture/Pattern */}
      <div className="absolute inset-0 bg-brand-pattern opacity-[0.01]"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-24 items-center">
          {/* Text Side */}
          <div className="space-y-12">
            <div className="space-y-6">
              <h4 className="text-[13px] font-bold tracking-[0.2em] text-[#FF6581] uppercase">
                Start Today
              </h4>
              <h2 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
                Your Celebration <br />
                <span className="editorial-underline-gold">Begins Here.</span>
              </h2>
            </div>

            <p className="text-xl md:text-2xl text-gray-500 font-light leading-relaxed max-w-md">
              Join thousands of users who have chosen Giftologi for their
              life&apos;s most beautiful moments.
            </p>

            <div className="pt-4 flex items-center space-x-8">
              <button
                onClick={() => router.push("/login")}
                className="bg-[#FDD17D] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 px-12 py-6 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-900 hover:text-white transition-all duration-500 shadow-xl hover:shadow-2xl whitespace-nowrap"
              >
                Create Your Registry
              </button>
              <Link
                href="/find-registry"
                className="cursor-poiner text-[10px] font-bold tracking-[0.2em] text-gray-900 uppercase border-b-2 border-gray-200 hover:border-gray-900 transition-all duration-300"
              >
                View Examples
              </Link>
            </div>
          </div>

          {/* Image Side - Photography: Object/Subject blend */}
          <div className="relative">
            <div className="aspect-[4/5] rounded-[4rem] overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-700">
              <Image
                src="/feature-lifestyle.png"
                alt="Giftologi Lifestyle"
                className="w-full h-full object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Overlay Block */}
              <div className="absolute inset-0 bg-[#FDD17D]/10 mix-blend-overlay"></div>
            </div>

            {/* Quote Over Image */}
            <div className="absolute -bottom-8 -left-8 bg-[#f5f0e8] border border-[#e8dfc8] p-8 shadow-xl max-w-[280px] transform rotate-[-4deg] rounded-sm flex flex-col items-center justify-center min-h-[160px]">
              <p className="text-xl font-handwriting text-gray-800 mb-2 text-center leading-snug">
                The most beautiful way to celebrate with those you love. ♡
              </p>
              <span className="block text-right w-full text-lg font-handwriting text-gray-800 mt-2">
                xo, Giftologi
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

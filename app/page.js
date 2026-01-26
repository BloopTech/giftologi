"use client";
import React from "react";
import { Mail } from "lucide-react";
import Image from "next/image";
import Logo from "../public/giftologi-logo.png";
import Link from "next/link";

export default function Home() {
  return (
    <div
      className="bg-[#16150FB2] text-black flex flex-col min-h-screen gap-16 pt-5 px-10 w-full items-center justify-center"
      style={{
        backgroundImage: "url('/coming_soon_layer.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <main
        id="main-content"
        role="main"
        aria-label="Coming soon announcement"
        className="flex flex-col items-center justify-center w-full"
      >
        <article className="rounded-2xl relative overflow-hidden max-w-6xl mx-auto bg-[#FFFCEF] fade-in-up delay-3 border border-transparent font-poppins">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[55px] -right-2 w-[100%] h-[10px] bg-[#D2BF7C] origin-top-right rotate-40 z-1"
          />
          <div className="relative z-10 p-8 flex flex-col md:flex-row space-x-0 space-y-4 md:space-y-0 items-center md:space-x-8 justify-center w-full">
            <div className="relative z-10 h-[80px] md:h-[100px] w-[30%]">
              <div className="h-full w-full">
              <Image
                src={Logo}
                alt="Giftologi logo"
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              </div>
            </div>
            <div className="relative z-10 flex flex-col space-y-4 w-full">
              <h1 className="text-[#85753C] font-semibold text-base">
                Hold the ribbon,
                <br />
                we&apos;re tying the knot on our site.
              </h1>
              <p className="text-xs text-[#85753C]">
                We&apos;re handpicking every detail, just for you. Sit
                tight—we&apos;ll be live soon.
              </p>
              <nav aria-label="Contact options" className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 w-full">
                <Link
                  href="mailto:hello@mygiftologi.com"
                  className="rounded-xl flex items-center justify-center px-4 py-2 bg-[#A5914B] text-xs text-white focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  aria-label="Send us an email at hello@mygiftologi.com"
                >
                  Send us an Email
                </Link>
                <Link
                  href="tel:+233598608892"
                  className="rounded-xl flex items-center justify-center px-8 py-2 bg-[#85753C] text-xs text-white focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  aria-label="Call us at +233 59 860 8892"
                >
                  Call Us
                </Link>
              </nav>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

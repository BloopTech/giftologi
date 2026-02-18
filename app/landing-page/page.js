"use client";
import React from "react";
import { Mail } from "lucide-react";
import Image from "next/image";
import Logo from "../../public/giftologi-logo.png";
import Link from "next/link";
import Footer from "../components/footer";
import PublicNavbar from "../components/PublicNavbar";
import HeroV3 from "../components/HeroV3";
import RegistryTypesV3 from "../components/RegistryTypesV3";
import Features from "../components/Features";
import VendorCTA from "../components/VendorCTA";
import CallToAction from "../components/CallToAction";
import BrandLogos from "../components/BrandLogos";

const LANDING_PAGE = true;

export default function Home() {
  return (
    <>
      {!LANDING_PAGE ? (
        <div
          className="bg-[#16150FB2] text-black flex flex-col min-h-screen gap-16 pt-5 px-4 sm:px-6 lg:px-10 w-full items-center justify-center"
          style={{
            backgroundImage: "url('/coming_soon_layer.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Skip to main content link for accessibility */}
          <Link
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
          >
            Skip to main content
          </Link>

          <main
            id="main-content"
            role="main"
            aria-label="Coming soon announcement"
            className="flex flex-col items-center justify-center w-full"
          >
            <article className="rounded-2xl relative overflow-hidden max-w-6xl mx-auto bg-[#FFFCEF] fade-in-up delay-3 border border-transparent font-brasley-medium shadow-xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-[55px] -right-2 w-[100%] h-[10px] bg-[#D2BF7C] origin-top-right rotate-40 z-1"
              />
              <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row space-x-0 space-y-4 md:space-y-0 items-center md:space-x-8 justify-center w-full">
                <div className="relative z-10 h-[80px] md:h-[100px] w-[120px] md:w-[30%]">
                  <div className="h-full w-full">
                    <Image
                      src={Logo}
                      alt="Giftologi"
                      fill
                      priority
                      sizes="(max-width: 768px) 120px, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </div>
                <div className="relative z-10 flex flex-col space-y-4 w-full text-center md:text-left">
                  <h1 className="text-[#85753C] font-semibold text-base sm:text-lg">
                    Hold the ribbon,
                    <br />
                    we&apos;re tying the knot on our site.
                  </h1>
                  <p className="text-xs sm:text-sm text-[#85753C]">
                    We&apos;re handpicking every detail, just for you. Sit
                    tight—we&apos;ll be live soon.
                  </p>
                  <nav
                    aria-label="Contact options"
                    className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0 w-full"
                  >
                    <Link
                      href="mailto:hello@mygiftologi.com"
                      className="rounded-xl flex items-center justify-center px-4 py-3 bg-[#A5914B] text-sm text-white hover:bg-[#8a7a3d] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A5914B]"
                      aria-label="Send us an email at hello@mygiftologi.com"
                    >
                      Send us an Email
                    </Link>
                    <Link
                      href="tel:+233598608892"
                      className="rounded-xl flex items-center justify-center px-8 py-3 bg-[#85753C] text-sm text-white hover:bg-[#6d6140] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#85753C]"
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
      ) : (
        <main className="min-h-screen bg-white">
          <PublicNavbar />
          <HeroV3 />
          <BrandLogos />
          <RegistryTypesV3 />
          {/* Features (from V1) */}
          <Features />
          {/* Everything else underneath Features in V1 */}
          <VendorCTA />
          <CallToAction />
          <Footer />
        </main>
      )}
    </>
  );
}

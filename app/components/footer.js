"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PiFacebookLogo, PiInstagramLogo, PiTwitterLogo } from "react-icons/pi";
import Image from "next/image";

const companyInfoStatic = [
  // { title: "Search Engine", href: "/search" },
  // { title: "Registries", href: "/registry" },
  // { title: "Shop", href: "/shop" },
  // { title: "Vendors' Storefront", href: "/storefront" },
  // { title: "Gift Guides", href: "/gift-guides" },
  // { title: "Support", href: "/support" },
];

const membersStatic = [
  { title: "Track Order", href: "/order/lookup" },
  { title: "Search Engine", href: "/search" },
  { title: "Registries", href: "/registry" },
  { title: "Shop", href: "/shop" },
  { title: "Gift Guides", href: "/gift-guides" },
  { title: "Support", href: "/support" },
];

export default function Footer() {
  const [dynamicPages, setDynamicPages] = useState([]);

  useEffect(() => {
    let active = true;
    const loadPages = async () => {
      try {
        const res = await fetch("/api/static-pages");
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data?.pages)) {
          setDynamicPages(
            data.pages.map((p) => ({
              title: p.title,
              href: `/pages/${p.slug}`,
            })),
          );
        }
      } catch {}
    };
    loadPages();
    return () => {
      active = false;
    };
  }, []);

  const companyInfo = [...companyInfoStatic, ...dynamicPages];
  const members = [...membersStatic];

  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      className="flex flex-col space-y-4 w-full bg-white pt-32 pb-16 px-6 sm:px-12 lg:px-24 border-t border-gray-50 relative overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.005]"
        style={{
          backgroundImage: "url('/pattern.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
        }}
      />
      <div className="w-full rounded-md p-8 max-w-7xl mx-auto mb-28">
        <div className="grid lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center space-x-4">
              <Image
                src="/logo.jpg"
                alt="Giftologi"
                className="rounded-full"
                priority
                width={40}
                height={40}
              />
              <span className="text-2xl font-bold text-gray-900 font-serif tracking-tight">
                Giftologi
              </span>
            </div>
            <p className="text-lg text-gray-400 font-light leading-relaxed">
              Elevating the experience of giving. A curated space for your
              life&apos;s most beautiful celebrations.
            </p>
            <div className="flex space-x-6">
              {[
                { icon: PiFacebookLogo, href: "#" },
                { icon: PiInstagramLogo, href: "#" },
                { icon: PiTwitterLogo, href: "#" },
              ].map((social, i) => (
                <Link
                  key={i}
                  href={social.href}
                  className="text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <social.icon size={20} />
                </Link>
              ))}
            </div>
          </div>
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-12 text-left">
            <nav
              aria-label="Member resources"
              className="flex flex-col space-y-4"
            >
              <h2 className="font-semibold">Platform</h2>
              <ul className="flex flex-col space-y-2 list-none p-0 m-0">
                {members.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-xs text-[#909090] hover:text-primary focus:text-primary"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav
              aria-label="Company information"
              className="flex flex-col space-y-4"
            >
              <h2 className="font-semibold">Company</h2>
              <ul className="flex flex-col space-y-2 list-none p-0 m-0">
                {companyInfo.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-xs text-[#909090] hover:text-primary focus:text-primary"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex flex-col space-y-2">
              <h2 className="font-semibold" id="connect-heading">
                Connect with Us
              </h2>
              <form
                className="flex flex-col space-y-2"
                aria-labelledby="connect-heading"
              >
                <label htmlFor="contact" className="sr-only">
                  Your email address
                </label>
                <input
                  type="email"
                  name="contact"
                  id="contact"
                  placeholder="Enter your email"
                  aria-describedby="contact-hint"
                  className="border border-[#DCDCDE] bg-white text-black rounded-xl px-2 py-1 focus:border-[#A5914B] focus:ring-1 focus:ring-[#A5914B] focus:outline-none"
                />
                <span id="contact-hint" className="sr-only">
                  Enter your email to get in touch with us
                </span>
                <button
                  type="submit"
                  className="w-fit text-white cursor-pointer text-xs/tight bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] focus:bg-white focus:text-[#A5914B] rounded-2xl px-4 py-2 flex items-center"
                >
                  Contact Us
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-12 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8 text-gray-400">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} Giftologi LLC • Dedicated to elegance.
        </p>
        <div className="flex space-x-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-200">
            Built by Bloop Global LLC
          </span>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full border border-gray-100 flex items-center justify-center text-[10px] font-serif">
              8
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Giftologi
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

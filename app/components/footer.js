"use client";
import React from "react";
import Link from "next/link";

const companyInfo = [
  {
    title: "About Us",
    href: "/about",
  },
  {
    title: "Wedding Guides",
    href: "/wedding-guides",
  },
  {
    title: "Baby Guides",
    href: "/baby-guides",
  },
  {
    title: "What is a Universal Gift List?",
    href: "/what-is-a-universal-gift-list",
  },
  {
    title: "Contact Us",
    href: "/contact",
  },
  {
    title: "News and Press Releases",
    href: "/news",
  },
  {
    title: "Terms and Conditions",
    href: "/terms-and-conditions",
  },
  {
    title: "Privacy Statement",
    href: "/privacy-statement",
  },
  {
    title: "Careers",
    href: "/careers",
  },
  {
    title: "Search Engine",
    href: "/search",
  },
  {
    title: "Registries",
    href: "/registry",
  },
  {
    title: "Shop",
    href: "/shop",
  },
  {
    title: "Vendors' Storefront",
    href: "/storefront",
  },
];

const members = [
  {
    title: "About Us",
    href: "/about",
  },
  {
    title: "Track Order",
    href: "/order/lookup",
  },
  {
    title: "Wedding Guides",
    href: "/wedding-guides",
  },
  {
    title: "Baby Guides",
    href: "/baby-guides",
  },
  {
    title: "What is a Universal Gift List?",
    href: "/what-is-a-universal-gift-list",
  },
  {
    title: "Contact Us",
    href: "/contact",
  },
  {
    title: "News and Press Releases",
    href: "/news",
  },
  {
    title: "Terms and Conditions",
    href: "/terms-and-conditions",
  },
  {
    title: "Privacy Statement",
    href: "/privacy-statement",
  },
  {
    title: "Careers",
    href: "/careers",
  },
];

const partners = [
  {
    title: "Partner Login",
    href: "/partner/login",
  },
  {
    title: "Partner Blog",
    href: "/partner/blog",
  },
  {
    title: "Advertise with Us",
    href: "/advertise-with-us",
  },
  {
    title: "Partner with Us",
    href: "/partner-with-us",
  },
];

export default function Footer() {
  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      className="flex flex-col space-y-4 w-full"
    >
      <div className="bg-[#E8E8E8] w-full border border-[#DCDCDE] rounded-md p-8">
        <div className="grid grid-cols-5 gap-8">
          <nav
            aria-label="Company information"
            className="flex flex-col space-y-4"
          >
            <h2 className="font-semibold">Company Info</h2>
            <ul className="flex flex-col space-y-2 list-none p-0 m-0">
              {companyInfo.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="text-xs text-[#909090] hover:text-[#247ACB] focus:text-[#247ACB]"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav
            aria-label="Member resources"
            className="flex flex-col space-y-4"
          >
            <h2 className="font-semibold">For Members</h2>
            <ul className="flex flex-col space-y-2 list-none p-0 m-0">
              {members.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="text-xs text-[#909090] hover:text-[#247ACB] focus:text-[#247ACB]"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav
            aria-label="Partner resources"
            className="flex flex-col space-y-4"
          >
            <h2 className="font-semibold">For Partners</h2>
            <ul className="flex flex-col space-y-2 list-none p-0 m-0">
              {partners.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="text-xs text-[#909090] hover:text-[#247ACB] focus:text-[#247ACB]"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="col-span-2 flex flex-col space-y-2">
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
      <p className="text-xs text-[#909090]">
        © 2025 All rights reserved - Giftologi LLC —{" "}
        <Link
          href="/sitemap"
          className="text-[#85753C] hover:underline focus:underline"
        >
          Site Map
        </Link>
      </p>
    </footer>
  );
}

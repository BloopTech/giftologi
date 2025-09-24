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
];

const members = [
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
    <div className="flex flex-col space-y-4 w-full">
      <div className="bg-[#E8E8E8] w-full border border-[#DCDCDE] rounded-md p-8">
        <div className="grid grid-cols-5 gap-8">
          <div className="flex flex-col space-y-4">
            <h1 className="font-semibold">Company Info</h1>
            <div className="flex flex-col space-y-2">
              {companyInfo.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="text-xs text-[#909090] hover:text-[#247ACB]"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col space-y-4">
            <h1 className="font-semibold">For Members</h1>
            <div className="flex flex-col space-y-2">
              {members.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="text-xs text-[#909090] hover:text-[#247ACB]"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col space-y-4">
            <h1 className="font-semibold">For Partners</h1>
            <div className="flex flex-col space-y-2">
              {partners.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="text-xs text-[#909090] hover:text-[#247ACB]"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex flex-col space-y-2">
            <h1 className="font-semibold">Connect with Us</h1>
            <div className="flex flex-col space-y-2">
              <input
                name="contact"
                id="contact"
                className="border border-[#DCDCDE] bg-white text-black rounded-xl px-2 py-1 focus:border-[#A5914B] focus:ring-1 focus:ring-[#A5914B] focus:outline-none"
              />
              <button className="w-fit text-white cursor-pointer text-xs/tight bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-2xl px-4 py-2 flex items-center">
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-[#909090]">
        © 2025 All rights reserved - Giftologi LLC —{" "}
        <span className="text-[#85753C]">Site Map</span>
      </p>
    </div>
  );
}

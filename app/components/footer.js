"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PiFacebookLogo, PiInstagramLogo, PiTwitterLogo } from "react-icons/pi";
import Image from "next/image";
import { createClient as createSupabaseClient } from "../utils/supabase/client";
import { roleRedirects } from "../routes";
import { useStaticPageLinks } from "../utils/content/useStaticPageLinks";

const hostAndGuestsStatic = [
  { title: "Your Dashboard", href: "/login" },
  { title: "Track Your Order", href: "/order/lookup" },
  { title: "Search Giftologi", href: "/search" },
];

const vendorsStatic = [
  { title: "Vendor Guide", href: "/vendor" },
  { title: "Become a Vendor", href: "/vendor" },
  { title: "Your Vendor Account", href: "/login" },
];

const legalStatic = [];

const needHelpStatic = [
  { title: "FAQs", href: "/faq" },
  { title: "Contact", href: "/contact Us" },
  { title: "Support Tickets", href: "/support" },
];

const LEGAL_PAGE_KEYWORDS = [
  "terms",
  "condition",
  "privacy",
  "refund",
  "return",
  "shipping",
  "cookie",
  "policy",
];

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

const matchesKeyword = (page, keywords) => {
  const title = normalize(page?.title);
  const slug = normalize(page?.slug);
  return keywords.some((keyword) => title.includes(keyword) || slug.includes(keyword));
};

export default function Footer() {
  const { pages } = useStaticPageLinks();
  const [dashboardHref, setDashboardHref] = useState("/login");

  useEffect(() => {
    const supabase = createSupabaseClient();
    let active = true;

    const loadAuthState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active) return;

        if (!user) {
          setDashboardHref("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!active) return;

        const role = profile?.role;
        setDashboardHref(role && roleRedirects[role] ? roleRedirects[role] : "/dashboard/h");
      } catch {
        if (active) setDashboardHref("/login");
      }
    };

    loadAuthState();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAuthState();
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const dynamicPages = useMemo(
    () =>
      (Array.isArray(pages) ? pages : [])
        .filter((page) => page?.slug)
        .map((page) => ({
          title: page.title,
          slug: page.slug,
          href: `/pages/${page.slug}`,
        })),
    [pages],
  );

  const legalDynamicPages = useMemo(
    () => dynamicPages.filter((page) => matchesKeyword(page, LEGAL_PAGE_KEYWORDS)),
    [dynamicPages],
  );

  const needHelp = [...needHelpStatic];
  const vendors = vendorsStatic.map((item) =>
    item.title === "Your Vendor Account" ? { ...item, href: dashboardHref } : item,
  );
  const legal = [...legalStatic, ...legalDynamicPages];
  const hostAndGuests = hostAndGuestsStatic.map((item) =>
    item.title === "Your Dashboard" ? { ...item, href: dashboardHref } : item,
  );

  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      className="flex flex-col space-y-4 w-full bg-white pt-32 pb-16 px-6 sm:px-12 lg:px-22 border-t border-gray-50 relative overflow-hidden"
    >
      {/* <div
        className="absolute inset-0 opacity-[0.005]"
        style={{
          backgroundImage: "url('/pattern.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
        }}
      /> */}
      <div className="w-full rounded-md max-w-6xl mx-auto mb-28">
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
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-12 text-left">
            <nav
              aria-label="Member resources"
              className="flex flex-col space-y-4"
            >
              <h2 className="font-semibold text-sm">FOR HOSTS & GUESTS</h2>
              <ul className="flex flex-col space-y-2 list-none p-0 m-0">
                {hostAndGuests.map((item) => (
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
              aria-label="Vendors Information"
              className="flex flex-col space-y-4"
            >
              <h2 className="font-semibold text-sm">FOR VENDORS</h2>
              <ul className="flex flex-col space-y-2 list-none p-0 m-0">
                {vendors.map((item) => (
                  <li key={item.title}>
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
              aria-label="Legal information"
              className="flex flex-col space-y-4"
            >
              <h2 className="font-semibold text-sm">LEGAL</h2>
              <ul className="flex flex-col space-y-2 list-none p-0 m-0">
                {legal.map((item) => (
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
              aria-label="Help information"
              className="flex flex-col space-y-4"
            >
              <h2 className="font-semibold text-sm">NEED HELP?</h2>
              <ul className="flex flex-col space-y-2 list-none p-0 m-0">
                {needHelp.map((item) => (
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
            {/* <div className="flex flex-col space-y-2">
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
            </div> */}
          </div>
        </div>
      </div>

      <div className="pt-12 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8 text-gray-400">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} Giftologi LLC • Dedicated to elegance.
        </p>
        <div className="flex space-x-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
            Built by Bloop Global LLC
          </span>
          {/* <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full border border-gray-100 flex items-center justify-center text-[10px] font-serif">
              8
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Giftologi
            </span>
          </div> */}
        </div>
      </div>
    </footer>
  );
}

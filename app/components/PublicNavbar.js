"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, LogIn } from "lucide-react";
import { createClient as createSupabaseClient } from "../utils/supabase/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./Avatar";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/registry", label: "Registry" },
  { href: "/storefront", label: "Stores" },
];

function getInitials(profile) {
  const first = profile?.firstname?.[0] || "";
  const last = profile?.lastname?.[0] || "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return "U";
}

function getDashboardHref(profile) {
  const role = profile?.role;
  if (role === "vendor") return "/dashboard/v";
  if (role === "host") return "/dashboard/h";
  if (
    role === "super_admin" ||
    role === "finance_admin" ||
    role === "operations_manager_admin" ||
    role === "customer_support_admin" ||
    role === "store_manager_admin" ||
    role === "marketing_admin"
  )
    return "/dashboard/admin";
  return "/dashboard/h";
}

export default function PublicNavbar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (ignore) return;
        if (!authUser) {
          setLoaded(true);
          return;
        }
        setUser(authUser);
        const { data: prof } = await supabase
          .from("profiles")
          .select("firstname, lastname, role, image, color")
          .eq("id", authUser.id)
          .single();
        if (!ignore) setProfile(prof || null);
      } catch {
        // ignore
      } finally {
        if (!ignore) setLoaded(true);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-sm border-b border-gray-200/60 dark:border-gray-800/60"
          : "bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/giftologi-logo.png"
            alt="Giftologi"
            width={36}
            height={36}
            priority
          />
          <span className="text-lg font-semibold text-[#85753C] hidden sm:inline">
            Giftologi
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-[#A5914B]/10 text-[#A5914B]"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side: search + auth */}
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Search"
          >
            <Search className="size-[18px]" />
          </Link>

          {loaded && !user && (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <LogIn className="size-4" />
                Log in
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#A5914B] rounded-lg hover:bg-[#8B7A3F] transition-colors"
              >
                Sign up
              </Link>
            </>
          )}

          {loaded && user && profile && (
            <Link
              href={getDashboardHref(profile)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Go to dashboard"
            >
              <Avatar
                className="h-8 w-8"
                color={profile.color}
                imageUrl={profile.image}
                initials={getInitials(profile)}
              >
                {!profile.image && (
                  <AvatarFallback className={`bg-[${profile.color}] text-white text-xs font-medium`}>
                    {getInitials(profile)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                {profile.firstname || "Dashboard"}
              </span>
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 pb-4 pt-2">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-[#A5914B]/10 text-[#A5914B]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/search"
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive("/search")
                  ? "bg-[#A5914B]/10 text-[#A5914B]"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Search className="size-4" />
              Search
            </Link>
          </nav>

          {loaded && !user && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Link
                href="/login"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <LogIn className="size-4" />
                Log in
              </Link>
              <Link
                href="/signup"
                className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-[#A5914B] rounded-lg hover:bg-[#8B7A3F] transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

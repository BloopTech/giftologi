"use client";
import React, { useState, useEffect } from "react";
import { cx, focusRing } from "../../../../../components/utils";
import {
  ChevronRight,
  OctagonAlert,
  Sun,
  ChevronDown,
  MoveLeft,
} from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import MobileSidebar from "./mobileSidebar";
import {
  WorkspacesDropdownDesktop,
  WorkspacesDropdownMobile,
} from "./sidebarWorkspacesDropdown";
import { UserProfileDesktop, UserProfileMobile } from "./userProfile";
import { useNavigationData } from "./utils";
import { DropdownTheme, DropdownUserProfile } from "./dropdownUserProfile";
import { createClient } from "../../../../../utils/supabase/client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PiStorefront } from "react-icons/pi";

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState({});
  const navigation = useNavigationData();
  const supabase = createClient();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!ignore) {
        if (error) {
          console.error("profiles select error", error);
          setError(error);
        }
        setUserData(data || null);
        setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  const isActive = (itemHref) => {
    if (itemHref === "/") {
      return pathname.startsWith("/settings");
    }
    return pathname === itemHref;
  };

  const toggleDropdown = (itemName) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  return (
    <>
      {/* sidebar (lg+) */}
      <nav className="hidden lg:fixed lg:top-[6rem] lg:bottom-0 lg:z-40 lg:flex lg:w-64 lg:flex-col left-[2rem]">
        <aside
          className={`h-auto py-8 w-full flex flex-col mx-auto border border-[#f4f4f4] bg-white rounded-xl`}
        >
          <nav
            aria-label="core navigation links"
            className={`flex flex-1 flex-col space-y-2 overflow-y-auto mb-12`}
          >
            {navigation?.map(({ label, items, id }) => {
              return (
                <div key={id} className="flex flex-col space-y-1">
                  <span className="text-xs text-[#686868] dark:text-white pl-[4rem] font-medium">
                    {label}
                  </span>

                  <ul role="list" className="w-full">
                    {items.map(
                      ({ name, href, icon: Icon, other_items }, index) => {
                        const hasDropdown =
                          other_items && other_items.length > 0;
                        const isDropdownOpen = openDropdowns[name] || false;

                        return (
                          <li key={name} className="flex flex-col">
                            {hasDropdown ? (
                              <button
                                onClick={() => toggleDropdown(name)}
                                className={cx(
                                  isActive(href)
                                    ? "text-white bg-primary dark:text-white border border-primary hover:text-primary hover:!bg-white hover:dark:text-primary"
                                    : "text-[#686868] hover:text-white dark:text-white hover:dark:text-gray-50",
                                  "flex items-center justify-between text-xs py-1 transition hover:bg-primary hover:dark:bg-gray-900 font-medium group w-full",
                                  focusRing,
                                )}
                              >
                                <div className="flex items-center gap-x-8">
                                  <span className="flex items-center justify-between pl-[1rem]">
                                    <Icon
                                      aria-hidden="true"
                                      className={cx(
                                        isActive(href)
                                          ? " dark:text-white group-hover:text-primary dark:group-hover:text-white"
                                          : "text-[#686868] group-hover:text-white dark:text-white hover:dark:text-gray-50",
                                        "size-4 shrink-0 text-[#686868] flex items-center justify-center",
                                        focusRing,
                                      )}
                                    />
                                  </span>
                                  {name}
                                </div>
                                <ChevronDown
                                  className={cx(
                                    "size-4 mr-4 transition-transform",
                                    isDropdownOpen ? "rotate-180" : "rotate-0",
                                  )}
                                />
                              </button>
                            ) : (
                              <NextLink
                                href={href}
                                className={cx(
                                  isActive(href)
                                    ? "text-primary dark:text-white border border-white hover:border-primary hover:text-primary hover:!bg-white hover:dark:text-primary"
                                    : "text-[#686868] hover:text-white dark:text-white hover:dark:text-gray-50",
                                  "flex items-center gap-x-8 text-xs py-1 transition hover:bg-primary hover:dark:bg-gray-900 font-medium group",
                                  focusRing,
                                )}
                              >
                                <span className="flex items-center justify-between pl-[1rem]">
                                  <Icon
                                    aria-hidden="true"
                                    className={cx(
                                      isActive(href)
                                        ? "dark:text-white text-primary group-hover:text-primary dark:group-hover:text-primary"
                                        : "text-[#686868] group-hover:text-white dark:text-white hover:dark:text-gray-50",
                                      "size-4 shrink-0 flex items-center justify-center",
                                      focusRing,
                                    )}
                                  />
                                </span>
                                {name}
                              </NextLink>
                            )}

                            {hasDropdown && isDropdownOpen && (
                              <ul className="ml-12 mt-1 space-y-1">
                                {other_items.map((subItem) => (
                                  <li key={subItem.name}>
                                    <NextLink
                                      href={subItem.href}
                                      className={cx(
                                        isActive(subItem.href)
                                          ? "text-white bg-primary dark:text-white border border-primary hover:text-primary hover:!bg-white hover:dark:text-primary"
                                          : "text-[#686868] hover:text-white dark:text-white hover:dark:text-gray-50",
                                        "flex items-center text-xs py-0.5 transition hover:bg-primary hover:dark:bg-gray-900 font-medium group pl-4",
                                        focusRing,
                                      )}
                                    >
                                      {subItem.name}
                                    </NextLink>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      },
                    )}
                  </ul>
                </div>
              );
            })}
            
          </nav>
          <div>
              <button className="text-[#D61711] py-1 cursor-pointer hover:text-white hover:bg-[#D61711] px-4 flex gap-8 w-full text-xs items-center">
                <PiStorefront className="size-4" />
                <span>Request to Close Shop</span>
              </button>
            </div>
        </aside>
      </nav>
    </>
  );
}

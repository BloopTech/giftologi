"use client";
import React, { useState } from "react";
import { cx, focusRing } from "../../../../../components/utils";
import { ChevronRight, OctagonAlert, Sun, ChevronDown } from "lucide-react";
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

import { useRouter } from "next/navigation";

export default function VendorSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState({});
  const navigation = useNavigationData();

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
      <nav className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col border-r border-[#f4f4f4]">
        <div>
          <WorkspacesDropdownDesktop />
        </div>

        <nav
          aria-label="core navigation links"
          className="flex flex-1 flex-col space-y-3"
        >
          {navigation?.map(({ label, items, id }) => {
            return (
              <div key={id} className="flex flex-col space-y-1">
                <span className="text-xs text-[#111827] dark:text-white pl-[4rem]">
                  {label}
                </span>

                <ul role="list" className="w-full">
                  {items.map(
                    ({ name, href, icon: Icon, other_items }, index) => {
                      const hasDropdown = other_items && other_items.length > 0;
                      const isDropdownOpen = openDropdowns[name] || false;

                      return (
                        <li key={name} className="flex flex-col">
                          {hasDropdown ? (
                            <button
                              onClick={() => toggleDropdown(name)}
                              className={cx(
                                isActive(href)
                                  ? "text-white bg-[#2C3E50] dark:text-white border border-[#2C3E50] hover:text-[#2C3E50] hover:!bg-white hover:dark:text-[#2C3E50]"
                                  : "text-[#111827] hover:text-white dark:text-white hover:dark:text-gray-50",
                                "flex items-center justify-between text-xs py-1.5 transition hover:bg-[#2C3E50] hover:dark:bg-gray-900 font-medium group w-full",
                                focusRing
                              )}
                            >
                              <div className="flex items-center gap-x-8">
                                <span className="flex items-center justify-between pl-[1rem]">
                                  <Icon
                                    aria-hidden="true"
                                    className={cx(
                                      isActive(href)
                                        ? " dark:text-white group-hover:text-[#2C3E50] dark:group-hover:text-white"
                                        : "text-[#111827] group-hover:text-white dark:text-white hover:dark:text-gray-50",
                                      "size-4 shrink-0 text-[#111827] flex items-center justify-center",
                                      focusRing
                                    )}
                                  />
                                </span>
                                {name}
                              </div>
                              <ChevronDown
                                className={cx(
                                  "size-4 mr-4 transition-transform",
                                  isDropdownOpen ? "rotate-180" : "rotate-0"
                                )}
                              />
                            </button>
                          ) : (
                            <NextLink
                              href={href}
                              className={cx(
                                isActive(href)
                                  ? "text-white bg-[#2C3E50] dark:text-white border border-[#2C3E50] hover:text-[#2C3E50] hover:!bg-white hover:dark:text-[#2C3E50]"
                                  : "text-[#111827] hover:text-white dark:text-white hover:dark:text-gray-50",
                                "flex items-center gap-x-8 text-xs py-1.5 transition hover:bg-[#2C3E50] hover:dark:bg-gray-900 font-medium group",
                                focusRing
                              )}
                            >
                              <span className="flex items-center justify-between pl-[1rem]">
                                <Icon
                                  aria-hidden="true"
                                  className={cx(
                                    isActive(href)
                                      ? " dark:text-white text-white group-hover:text-[#2C3E50] dark:group-hover:text-[#2C3E50]"
                                      : "text-[#111827] group-hover:text-white dark:text-white hover:dark:text-gray-50",
                                    "size-4 shrink-0 flex items-center justify-center",
                                    focusRing
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
                                        ? "text-white bg-[#2C3E50] dark:text-white border border-[#2C3E50] hover:text-[#2C3E50] hover:!bg-white hover:dark:text-[#2C3E50]"
                                        : "text-[#111827] hover:text-white dark:text-white hover:dark:text-gray-50",
                                      "flex items-center text-xs py-1.5 transition hover:bg-[#2C3E50] hover:dark:bg-gray-900 font-medium group pl-4",
                                      focusRing
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
                    }
                  )}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="w-full inline-flex gap-x-5 items-end">
          <UserProfileDesktop />
        </div>
      </nav>
      {/* top navbar (xs-lg) */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-2 shadow-sm sm:gap-x-6 sm:px-4 lg:hidden dark:border-gray-800 dark:bg-gray-950">
        <WorkspacesDropdownMobile />
        <div className="flex items-center gap-1 sm:gap-2">
          <UserProfileMobile />
          <MobileSidebar />
        </div>
      </div>
    </>
  );
}

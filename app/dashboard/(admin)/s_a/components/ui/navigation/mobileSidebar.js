"use client";
import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../../../../../../components/Drawer";
import { cx, focusRing } from "../../../../../../components/utils";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown } from "lucide-react";
import { useNavigationData } from "./utils";
import { Switch } from "../../../../../../components/Switch";

import { toast } from "sonner";

export default function MobileSidebar(props) {
  const { userData } = props;
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState({});

  const navigation = useNavigationData();

  // Add state to control the switch
  const [isLiveMode, setIsLiveMode] = useState(false);

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
      <Drawer>
        <DrawerTrigger asChild>
          <button
            //variant="ghost"
            aria-label="open sidebar"
            className="cursor-pointer group dark:text-white flex items-center rounded-md p-2 text-sm font-medium hover:bg-gray-100 data-[state=open]:bg-gray-100 hover:dark:bg-gray-400/10"
          >
            <Menu className="size-6 shrink-0 sm:size-5" aria-hidden="true" />
          </button>
        </DrawerTrigger>
        <DrawerContent className="sm:max-w-lg">
          <DrawerHeader>
            <DrawerTitle>
              {userData?.firstname?.charAt(0)}
              {userData?.lastname?.charAt(0)}
            </DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <nav
              aria-label="core navigation links"
              className="flex flex-1 flex-col space-y-5 px-4"
            >
              {navigation?.map(({ label, items, id }) => {
                return (
                  <div key={id} className="flex flex-col space-y-3">
                    <span className="text-xs text-text dark:text-white">
                      {label}
                    </span>
                    <ul role="list" className="space-y-1">
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
                                      ? "text-primary dark:text-primary"
                                      : "text-text hover:text-gray-900 dark:text-white hover:dark:text-gray-50",
                                    "flex items-center justify-between w-full rounded-md py-1.5 text-xs transition hover:bg-gray-100 hover:dark:bg-gray-900 font-medium",
                                    focusRing
                                  )}
                                >
                                  <div className="flex items-center gap-x-2.5">
                                    <Icon
                                      className="size-4 shrink-0"
                                      aria-hidden="true"
                                    />
                                    {name}
                                  </div>
                                  <ChevronDown
                                    className={cx(
                                      "size-4 transition-transform",
                                      isDropdownOpen ? "rotate-180" : "rotate-0"
                                    )}
                                  />
                                </button>
                              ) : (
                                <NextLink
                                  href={href}
                                  className={cx(
                                    isActive(href)
                                      ? "text-primary dark:text-primary"
                                      : "text-text hover:text-gray-900 dark:text-white hover:dark:text-gray-50",
                                    "flex items-center gap-x-2.5 rounded-md py-1.5 text-xs transition hover:bg-gray-100 hover:dark:bg-gray-900 font-medium",
                                    focusRing
                                  )}
                                >
                                  <Icon
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                  />
                                  {name}
                                </NextLink>
                              )}

                              {/* Dropdown items */}
                              {hasDropdown && isDropdownOpen && (
                                <ul className="ml-6 mt-1 space-y-1">
                                  {other_items.map((subItem) => (
                                    <li key={subItem.name}>
                                      <NextLink
                                        href={subItem.href}
                                        className={cx(
                                          isActive(subItem.href)
                                            ? "text-primary dark:text-primary"
                                            : "text-text hover:text-gray-900 dark:text-white hover:dark:text-gray-50",
                                          "flex items-center py-1.5 text-xs transition hover:bg-gray-100 hover:dark:bg-gray-900 font-medium pl-4",
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
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

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
} from "../../../../../components/Drawer";
import { cx, focusRing } from "../../../../../components/utils";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown, X, Plus, MoveLeft } from "lucide-react";
import { useNavigationData } from "./utils";
import { Switch } from "../../../../../components/Switch";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../../components/Avatar";

import { toast } from "sonner";

export default function MobileSidebar(props) {
  const {
    userData,
    roleDisplayName,
    onLogout,
    loggingOut,
    onOpenAddStaff,
    onOpenAddVendor,
    showStaffVendorButtons,
  } = props;
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
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>
              {userData?.firstname?.charAt(0)}
              {userData?.lastname?.charAt(0)}
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                aria-label="close sidebar"
                className="cursor-pointer rounded-full p-2 text-sm text-text hover:bg-gray-100 hover:dark:bg-gray-900"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <DrawerBody>
            {pathname !== "/dashboard/admin" && (
              <div className="px-4 mb-4">
                <DrawerClose asChild>
                  <NextLink
                    href="/dashboard/admin"
                    className="text-primary text-xs flex items-center space-x-2"
                  >
                    <MoveLeft className="size-4" />
                    <span>Back to Dashboard Overview</span>
                  </NextLink>
                </DrawerClose>
              </div>
            )}
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
                                <DrawerClose asChild>
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
                                </DrawerClose>
                              )}

                              {/* Dropdown items */}
                              {hasDropdown && isDropdownOpen && (
                                <ul className="ml-6 mt-1 space-y-1">
                                  {other_items.map((subItem) => (
                                    <li key={subItem.name}>
                                      <DrawerClose asChild>
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
                                      </DrawerClose>
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
            <div className="mt-8 border-t border-gray-200 pt-4 space-y-4">
              {userData && (
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8 shadow-xl">
                    <AvatarImage
                      src={userData?.image}
                      alt={userData?.firstname}
                      className="object-cover"
                    />
                    <AvatarFallback
                      style={{ backgroundColor: userData?.color }}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs text-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    >
                      {userData?.firstname?.charAt(0)}
                      {userData?.lastname?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm text-[#A2845E]">
                      Hello{" "}
                      <span className="font-semibold">
                        {userData?.firstname}
                      </span>
                    </p>
                    {roleDisplayName && (
                      <span className="text-xs text-[#A2845E]">
                        {roleDisplayName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {showStaffVendorButtons && (
                <div className="flex flex-col gap-2">
                  <DrawerClose asChild>
                    <button
                      type="button"
                      onClick={onOpenAddStaff}
                      className="w-full px-4 py-2 flex items-center justify-center border border-[#427ED3] text-[#427ED3] bg-white text-xs rounded-full cursor-pointer hover:text-white hover:bg-[#427ED3]"
                    >
                      <Plus className="size-4 mr-1.5" />
                      Add Staff
                    </button>
                  </DrawerClose>
                  <DrawerClose asChild>
                    <button
                      type="button"
                      onClick={onOpenAddVendor}
                      className="w-full py-2 px-4 flex items-center justify-center border border-[#427ED3] text-white bg-[#427ED3] text-xs rounded-full cursor-pointer hover:text-[#427ED3] hover:bg-white"
                    >
                      <Plus className="size-4 mr-1.5" />
                      Add Vendor
                    </button>
                  </DrawerClose>
                </div>
              )}

              <DrawerClose asChild>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="w-full text-xs text-red-500 hover:text-white hover:bg-red-500 transition-colors cursor-pointer flex items-center justify-center border border-red-500 rounded-full px-4 py-2 disabled:opacity-60"
                >
                  Log Out
                </button>
              </DrawerClose>
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

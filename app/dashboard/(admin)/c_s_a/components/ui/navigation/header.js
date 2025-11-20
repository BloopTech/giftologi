"use client";
import React, { useState, useTransition, useEffect } from "react";
import { Globe, Check, ShoppingCart, CircleChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../../../../../../components/Switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSubMenu,
  DropdownMenuSubMenuContent,
  DropdownMenuSubMenuTrigger,
  DropdownMenuTrigger,
} from "../../../../../../components/Dropdown";
import { createClient } from "../../../../../../utils/supabase/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../../../components/Avatar";
import { cx } from "../../../../../../components/utils";
import { DropdownUserProfile } from "./dropdownUserProfile";
import Image from "next/image";
import logo from "../../../../../../../public/giftologi-logo.png";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../../../components/Dialog";

export default function Header() {
  // Add state to control the switch
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Track scroll to toggle white background for header
  const [scrolled, setScrolled] = useState(false);

  // Control Create Registry dialog open state
  const [createRegistryOpen, setCreateRegistryOpen] = useState(false);
  const openCreateRegistry = () => setCreateRegistryOpen(true);
  const closeCreateRegistry = () => setCreateRegistryOpen(false);

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

  // Listen to scroll and set white background when scrolled
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    onScroll(); // initialize on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cx(
        "fixed left-0 top-0 z-10 w-full transition-colors duration-200",
        scrolled ? "bg-white shadow-sm" : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl w-full">
        <div className="flex justify-between w-full items-center">
          <div>
            <Link href="/dashboard/s_a" className="cursor-pointer">
              <div className="flex items-center space-x-2">
                <div className="flex aspect-square items-center justify-center">
                  <Image
                    src={logo}
                    alt="logo"
                    width={60}
                    height={60}
                    priority
                  />
                </div>
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-1">
                    <p className="text-lg font-medium text-[#686868]">
                      Giftologi
                    </p>
                    <span className="text-xs text-[#686868]">
                      Admin Dashboard
                    </span>
                  </div>
                  <span className="text-xs text-[#686868]">
                    Monitor operations, vendors, and registries in one place.
                  </span>
                </div>
              </div>
            </Link>
          </div>
          <div className="flex justify-end space-x-4 py-4 items-center">
            <div>
              <button className="px-4 py-2 flex items-center justify-center border border-[#427ED3] text-[#427ED3] bg-white text-xs rounded-full cursor-pointer hover:text-white hover:bg-[#427ED3]">
                <Plus className="size-4" />
                Add Staff
              </button>
            </div>
            <div>
              <button className="py-2 px-4 flex items-center justify-center border border-[#427ED3] text-white bg-[#427ED3] text-xs rounded-full cursor-pointer hover:text-[#427ED3] hover:bg-white">
                <Plus className="size-4" />
                Add Vendor
              </button>
            </div>
            <div
              className={cx(
                "flex items-center space-x-4 py-3 px-6 mx-auto w-xs",
                scrolled ? "" : "border-[#DCDCDE] bg-white border rounded-4xl"
              )}
            >
              <div className="text-sm text-[#A2845E] flex items-center justify-between w-full">
                <div className="text-sm text-[#A2845E] flex items-center space-x-2 ">
                  <div
                    aria-label="User settings"
                    //variant="ghost"
                    className={cx(
                      "group flex items-center rounded-md text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 data-[state=open]:bg-gray-100 hover:dark:bg-gray-400/10"
                    )}
                  >
                    <span className="relative">
                      {userData ? (
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
                      ) : (
                        <span className="w-8 h-8 shadow-xl rounded-full bg-[#A2845E] flex items-center justify-center" />
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col space-x-1 items-start">
                    <p className="text-sm text-[#A2845E]">
                      Hello{" "}
                      <span className="font-semibold">
                        {userData?.firstname}
                      </span>
                    </p>
                    <span className="text-xs text-[#A2845E]">Customer Support</span>
                  </div>
                </div>
                <button className="text-xs text-red-500 hover:text-white hover:bg-red-500 transition-colors cursor-pointer flex items-center border border-red-500 rounded-full px-4 py-1">
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

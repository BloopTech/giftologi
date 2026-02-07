"use client";
import React, { useState, useTransition, useEffect } from "react";
import { Globe, Check, ShoppingCart, CircleChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../../../../../components/Switch";
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
} from "../../../../../components/Dropdown";
import { createClient } from "../../../../../utils/supabase/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../../components/Avatar";
import { cx } from "../../../../../components/utils";
import NotificationBell from "../../../../../components/NotificationBell";
import { DropdownUserProfile } from "./dropdownUserProfile";
import Image from "next/image";
import logo from "../../../../../../public/giftologi-logo.png";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../../../../../components/Dialog";
import VisuallyHidden from "../../../../../components/accessibility/VisuallyHidden";
import CreateRegistryDialog from "../../createRegistryDialog";

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
        scrolled ? "bg-white shadow-sm" : "bg-transparent",
      )}
    >
      <div className="flex justify-between w-full items-center max-w-6xl mx-auto">
        <div>
          <Link href="/dashboard/h" className="cursor-pointer">
            <div className="flex items-center space-x-2">
              <div className="flex aspect-square items-center justify-center">
                <Image src={logo} alt="logo" width={60} height={60} priority />
              </div>
              <p className="text-lg font-semibold text-[#85753C]">Giftologi</p>
            </div>
          </Link>
        </div>
        <div className="flex justify-end w-full space-x-4 p-4 items-center">
          <div>
            <button
              onClick={openCreateRegistry}
              className="rounded-full cursor-pointer hover:bg-white hover:text-[#7EC335] flex items-center justify-center py-3 px-4 bg-[#7EC335] border border-[#5CAE2D] text-xs/tight text-white"
            >
              Create New Registry
            </button>
            <Dialog
              open={createRegistryOpen}
              onOpenChange={setCreateRegistryOpen}
            >
              <DialogContent className="max-w-2xl">
                <VisuallyHidden>
                  <DialogTitle>Create New Registry</DialogTitle>
                </VisuallyHidden>
                <CreateRegistryDialog onClose={closeCreateRegistry} />
              </DialogContent>
            </Dialog>
          </div>

          <div
            className={cx(
              "flex items-center space-x-4 py-3 px-6",
              scrolled ? "" : "border-[#DCDCDE] bg-white border rounded-4xl",
            )}
          >
            <div>
              <Link
                href="/dashboard/h/registry"
                className="text-xs text-[#A2845E] cursor-pointer font-semibold"
              >
                My Registry Lists
              </Link>
            </div>
            <div>
              <Link
                href="/shop"
                className="text-xs text-[#A2845E] cursor-pointer flex items-center space-x-2"
              >
                <ShoppingCart className="size-5" />
                <span>Shop</span>
              </Link>
            </div>

            <NotificationBell userId={userData?.id} />

            <div className="text-sm text-[#A2845E] flex items-center space-x-2">
              <button
                aria-label="User settings"
                //variant="ghost"
                className={cx(
                  "group flex items-center cursor-pointer rounded-md text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 data-[state=open]:bg-gray-100 hover:dark:bg-gray-400/10",
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
              </button>
              <p className="text-sm text-[#A2845E]">
                Hello{" "}
                <span className="font-semibold">{userData?.firstname}</span>
              </p>
              <DropdownUserProfile align="end" userData={userData}>
                <button className="flex items-center cursor-pointer">
                  <CircleChevronDown
                    size={28}
                    className="fill-[#A2845E] text-white font-bold"
                  />
                </button>
              </DropdownUserProfile>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

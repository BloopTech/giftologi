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
import { DropdownUserProfile } from "./dropdownUserProfile";

export default function Header() {
  // Add state to control the switch
  const [isLiveMode, setIsLiveMode] = useState(false);

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

  return (
    <nav className="fixed left-0 top-0 z-10 w-full hidden lg:inline-block">
      <div className="flex justify-end w-full space-x-4 p-4">
        <button className="rounded-full cursor-pointer hover:bg-white hover:text-[#7EC335] flex items-center justify-center px-4 bg-[#7EC335] border border-[#5CAE2D] text-xs text-white">
          Create New Registry
        </button>
        <div className="text-sm text-[#A2845E] cursor-pointer flex items-center space-x-1">
          <ShoppingCart size={20} />
          <p>Shop</p>
        </div>
        <div className="text-sm text-[#A2845E] flex items-center space-x-2">
          <button
            aria-label="User settings"
            //variant="ghost"
            className={cx(
              "group flex items-center cursor-pointer rounded-md text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 data-[state=open]:bg-gray-100 hover:dark:bg-gray-400/10"
            )}
          >
            <span className="relative">
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
            </span>
          </button>
          <p className="text-sm text-[#A2845E]">
            Hello <span className="font-semibold">{userData?.firstname}</span>
          </p>
          <DropdownUserProfile align="end" userData={userData}>
            <button className="flex items-center cursor-pointer">
              <CircleChevronDown size={28} className="fill-[#A2845E] text-white font-bold" />
            </button>
          </DropdownUserProfile>
        </div>
      </div>
    </nav>
  );
}

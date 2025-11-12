"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "../../../../../../utils/supabase/client";
import { cx, focusRing } from "../../../../../../components/utils";

import { DropdownUserProfile } from "./dropdownUserProfile";
import { Ellipsis, LogOut } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../../../components/Avatar";

export const UserProfileDesktop = (props) => {
  const { userData } = props;

  return (
    <DropdownUserProfile userData={userData}>
      <button
        aria-label="User settings"
        //variant="ghost"
        className={cx(
          focusRing,
          "group cursor-pointer flex w-full items-center justify-between rounded-md p-2 text-sm font-medium text-gray-900 hover:bg-gray-100 data-[state=open]:bg-gray-100 hover:dark:bg-gray-400/10"
        )}
      >
        <span className="flex items-center gap-3 text-xs">
          <span className="relative">
            <Avatar className="w-8 h-8 ring-4 ring-white shadow-xl">
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
          <span className="flex flex-col items-start justify-start dark:text-white">
            <span className="line-clamp-1">
              {userData?.firstname} {userData?.lastname}
            </span>
            <span className="text-[#800020] capitalize">{userData?.role}</span>
          </span>
        </span>
        <LogOut
          className="size-4 shrink-0 text-gray-500 group-hover:text-gray-700 group-hover:dark:text-white dark:text-white"
          aria-hidden="true"
        />
      </button>
    </DropdownUserProfile>
  );
};

export const UserProfileMobile = (props) => {
  const { userData } = props;

  return (
    <DropdownUserProfile align="end" userData={userData}>
      <button
        aria-label="User settings"
        //variant="ghost"
        className={cx(
          "group flex items-center rounded-md p-1 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 data-[state=open]:bg-gray-100 hover:dark:bg-gray-400/10"
        )}
      >
        <span className="relative">
          <Avatar className="w-8 h-8 ring-4 ring-white shadow-xl">
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
    </DropdownUserProfile>
  );
};

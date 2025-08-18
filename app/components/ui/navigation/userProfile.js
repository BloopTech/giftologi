"use client";
import { cx, focusRing } from "../../utils";

import { DropdownUserProfile } from "./dropdownUserProfile";
import { Ellipsis, LogOut } from "lucide-react";
import { useUser } from "../../../context/UserContext";
import { useTranslations } from "next-intl";

export const UserProfileDesktop = (props) => {
  const { userData, refreshUserData, isLoading } = useUser();
  const t = useTranslations("Navigation");

  return (
    <DropdownUserProfile>
      <button
        aria-label="User settings"
        //variant="ghost"
        className={cx(
          focusRing,
          "group cursor-pointer flex w-full items-center justify-between rounded-md p-2 text-sm font-medium text-gray-900 hover:bg-gray-100 data-[state=open]:bg-gray-100 hover:dark:bg-gray-400/10"
        )}
      >
        <span className="flex items-center gap-3 text-xs">
          <span
            className="bg-tertiary flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs text-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            aria-hidden="true"
          >
            {userData?.data?.user?.firstname?.[0]}{userData?.data?.user?.lastname?.[0]}
          </span>
          <span className="flex flex-col items-start justify-start dark:text-white">
            <span>{userData?.data?.user?.firstname} {userData?.data?.user?.lastname}</span>
            <span className="text-primary">{t("merchant")}</span>
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

export const UserProfileMobile = () => {
  const { userData, refreshUserData, isLoading } = useUser();
  
  return (
    <DropdownUserProfile align="end">
      <button
        aria-label="User settings"
        //variant="ghost"
        className={cx(
          "group flex items-center rounded-md p-1 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 data-[state=open]:bg-gray-100 hover:dark:bg-gray-400/10"
        )}
      >
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          aria-hidden="true"
        >
          {userData?.data?.user?.firstname?.[0]}{userData?.data?.user?.lastname?.[0]}
        </span>
      </button>
    </DropdownUserProfile>
  );
};

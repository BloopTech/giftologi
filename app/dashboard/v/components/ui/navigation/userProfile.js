"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "../../../../../utils/supabase/client";
import { cx, focusRing } from "../../../../../components/utils";

import { DropdownUserProfile } from "./dropdownUserProfile";
import { Ellipsis, LogOut } from "lucide-react";


export const UserProfileDesktop = (props) => {
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
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs text-white dark:border-gray-800 dark:bg-gray-950 dark:text-white`}
            aria-hidden="true"
            style={{ backgroundColor: userData?.color }}
          >
            {userData?.firstname[0]}{userData?.lastname[0]}
          </span>
          <span className="flex flex-col items-start justify-start dark:text-white">
            <span>{userData?.firstname} {userData?.lastname}</span>
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

export const UserProfileMobile = () => {
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
    <DropdownUserProfile align="end" userData={userData}>
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
          style={{ backgroundColor: userData?.color }}
        >
          {userData?.firstname[0]}{userData?.lastname[0]}
        </span>
      </button>
    </DropdownUserProfile>
  );
};

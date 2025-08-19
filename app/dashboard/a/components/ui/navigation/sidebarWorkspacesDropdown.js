"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../../components/Dropdown";
import { cx, focusInput } from "../../../../../components/utils";
import React, { useEffect, useRef, useState } from "react";
import {
  ChevronsUpDown,
  MoveRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "../../../../../utils/supabase/client";

const workspaces = [
  {
    value: "business-name",
    name: "Business Name",
    initials: "GA",
    role: "Merchant",
    color: "bg-primary dark:bg-primary",
  },
  // Add more workspaces...
];

export const WorkspacesDropdownDesktop = () => {
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasOpenDialog, setHasOpenDialog] = useState(false);
  const dropdownTriggerRef = useRef(null);
  const focusRef = useRef(null);

  const handleDialogItemSelect = () => {
    focusRef.current = dropdownTriggerRef.current;
  };

  const handleDialogItemOpenChange = (open) => {
    setHasOpenDialog(open);
    if (open === false) {
      setDropdownOpen(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <>
      {/* sidebar (lg+) */}
      <DropdownMenu
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <button
            className={cx(
              "cursor-pointer flex w-full items-center gap-x-1 bg-gray-200 px-2 text-sm shadow-sm transition-all hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 hover:dark:bg-gray-900",
              focusInput
            )}
          >
            <div className="flex aspect-square items-center justify-center px-2 -my-3">
              {/* <Image src={logo} alt="logo" width={80} height={80} priority /> */}
              LOGO
            </div>
            <div className="flex w-full items-center justify-between gap-x-4 truncate">
              <div className="truncate">
                <p className="truncate whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-50 line-clamp-1">
                  {userData?.firstname} {userData?.lastname}
                </p>
              </div>
              <ChevronDown
                className="size-5 shrink-0 text-gray-500 dark:text-white"
                aria-hidden="true"
              />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          hidden={hasOpenDialog}
          onCloseAutoFocus={(event) => {
            if (focusRef.current) {
              focusRef.current.focus();
              focusRef.current = null;
              event.preventDefault();
            }
          }}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              Workspaces ({workspaces.length})
            </DropdownMenuLabel>
            
              <DropdownMenuItem key={userData?.role}>
                <div className="flex w-full items-center gap-x-2.5">
                  <span
                    className={cx(
                      "bg-primary dark:bg-primary",
                      "flex aspect-square size-8 items-center justify-center rounded p-2 text-xs font-medium text-white"
                    )}
                    aria-hidden="true"
                  >
                    {userData?.role}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    {userData?.role}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-white">
                    {userData?.role}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
    
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export const WorkspacesDropdownMobile = () => {
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasOpenDialog, setHasOpenDialog] = useState(false);
  const dropdownTriggerRef = useRef(null);
  const focusRef = useRef(null);

  const handleDialogItemSelect = () => {
    focusRef.current = dropdownTriggerRef.current;
  };

  const handleDialogItemOpenChange = (open) => {
    setHasOpenDialog(open);
    if (open === false) {
      setDropdownOpen(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <>
      {/* sidebar (xs-lg) */}
      <DropdownMenu
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-x-1.5 rounded-md p-2 hover:bg-gray-100 focus:outline-none hover:dark:bg-gray-900">
            <div className="flex aspect-square items-center justify-center p-2">
              {/* <Image src={logo} alt="logo" width={80} height={80} priority /> */}
              Giftologi
            </div>

            <div className="flex w-full items-center justify-between gap-x-3 truncate">
              <p className="truncate whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-50 line-clamp-1">
                {userData?.role}
              </p>
              <ChevronsUpDown
                className="size-4 shrink-0 text-gray-500 dark:text-white"
                aria-hidden="true"
              />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="!min-w-72"
          hidden={hasOpenDialog}
          onCloseAutoFocus={(event) => {
            if (focusRef.current) {
              focusRef.current.focus();
              focusRef.current = null;
              event.preventDefault();
            }
          }}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              Workspaces ({workspaces.length})
            </DropdownMenuLabel>
            
              <DropdownMenuItem key={userData?.role}>
                <div className="flex w-full items-center gap-x-2.5">
                  <span
                    className={cx(
                      "bg-primary dark:bg-primary",
                      "flex size-8 items-center justify-center rounded p-2 text-xs font-medium text-white"
                    )}
                    aria-hidden="true"
                  >
                   {userData?.role}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {userData?.role}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                    {userData?.role}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

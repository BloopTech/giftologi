"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../Dropdown";
import { cx, focusInput } from "../../utils";
import React, { useRef, useState } from "react";
import { ModalAddWorkspace } from "./modalAddWorkspace";
import {
  ChevronsUpDown,
  MoveRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import logo from "../../../../public/logo-dark.png";
import { useUser } from "../../../context/UserContext";

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
  const { userData, refreshUserData, isLoading } = useUser();
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

  //console.log("workspaces", userData?.data);
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
              <Image src={logo} alt="logo" width={80} height={80} priority />
            </div>
            <div className="flex w-full items-center justify-between gap-x-4 truncate">
              <div className="truncate">
                <p className="truncate whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-50 line-clamp-1">
                  {userData?.data?.business?.business_name}
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
            
              <DropdownMenuItem key={userData?.data?.business?.business_name}>
                <div className="flex w-full items-center gap-x-2.5">
                  <span
                    className={cx(
                      "bg-primary dark:bg-primary",
                      "flex aspect-square size-8 items-center justify-center rounded p-2 text-xs font-medium text-white"
                    )}
                    aria-hidden="true"
                  >
                    {userData?.data?.business?.business_name?.[0]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    {userData?.data?.business?.business_name}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-white">
                    {userData?.data?.business?.business_type}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
    
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {/* <ModalAddWorkspace
            onSelect={handleDialogItemSelect}
            onOpenChange={handleDialogItemOpenChange}
            itemName="Add workspace"
          /> */}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export const WorkspacesDropdownMobile = () => {
  const { userData, refreshUserData, isLoading } = useUser();
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
              <Image src={logo} alt="logo" width={80} height={80} priority />
            </div>

            <div className="flex w-full items-center justify-between gap-x-3 truncate">
              <p className="truncate whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-50 line-clamp-1">
                {userData?.data?.business?.business_name}
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
            
              <DropdownMenuItem key={userData?.data?.business?.business_name}>
                <div className="flex w-full items-center gap-x-2.5">
                  <span
                    className={cx(
                      "bg-primary dark:bg-primary",
                      "flex size-8 items-center justify-center rounded p-2 text-xs font-medium text-white"
                    )}
                    aria-hidden="true"
                  >
                   {userData?.data?.business?.business_name?.[0]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {userData?.data?.business?.business_name}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                    {userData?.data?.business?.business_type}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {/* <ModalAddWorkspace
            onSelect={handleDialogItemSelect}
            onOpenChange={handleDialogItemOpenChange}
            itemName="Add workspace"
          /> */}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

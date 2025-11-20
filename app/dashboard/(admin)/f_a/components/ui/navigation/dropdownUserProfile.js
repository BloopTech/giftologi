"use client";
import React, { useEffect, useState, useTransition } from "react";
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
import { ArrowUpRight, Globe, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "../../../../../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export function DropdownUserProfile({ children, align = "start", userData }) {
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
    } catch (e) {
      console.error("signOut error", e);
      toast.error("Failed to log out");
    } finally {
      // Force a server navigation so middleware reads cleared cookies
      window.location.href = "/login";
      // Alternatively: router.replace('/login')
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          <DropdownMenuLabel>{userData?.email}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <Link
              href="/dashboard/h/lists"
              className="py-1.5 w-full hover:bg-gray-100 hover:dark:bg-gray-900 disabled:opacity-60 flex items-center cursor-pointer justify-between text-sm text-gray-900 dark:text-gray-50 pl-2 pr-1"
            >
              Lists
            </Link>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <Link
              href="/dashboard/h/registry-zero"
              className="py-1.5 w-full hover:bg-gray-100 hover:dark:bg-gray-900 disabled:opacity-60 flex items-center cursor-pointer justify-between text-sm text-gray-900 dark:text-gray-50 pl-2 pr-1"
            >
              Registry Zero
            </Link>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <Link
              href="/dashboard/h/registry"
              className="py-1.5 w-full hover:bg-gray-100 hover:dark:bg-gray-900 disabled:opacity-60 flex items-center cursor-pointer justify-between text-sm text-gray-900 dark:text-gray-50 pl-2 pr-1"
            >
              Registry
            </Link>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <Link
              href="/dashboard/h/purchased"
              className="py-1.5 w-full hover:bg-gray-100 hover:dark:bg-gray-900 disabled:opacity-60 flex items-center cursor-pointer justify-between text-sm text-gray-900 dark:text-gray-50 pl-2 pr-1"
            >
              Purchased
            </Link>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <Link
              href="/dashboard/h/public-registry"
              className="py-1.5 w-full hover:bg-gray-100 hover:dark:bg-gray-900 disabled:opacity-60 flex items-center cursor-pointer justify-between text-sm text-gray-900 dark:text-gray-50 pl-2 pr-1"
            >
              Public Registry
            </Link>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuSubMenu>
              <DropdownMenuSubMenuTrigger>Theme</DropdownMenuSubMenuTrigger>
              <DropdownMenuSubMenuContent>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) => {
                    setTheme(value);
                  }}
                >
                  <DropdownMenuRadioItem
                    aria-label="Switch to Light Mode"
                    value="light"
                    iconType="check"
                  >
                    <Sun className="size-4 shrink-0" aria-hidden="true" />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    aria-label="Switch to Dark Mode"
                    value="dark"
                    iconType="check"
                  >
                    <Moon className="size-4 shrink-0" aria-hidden="true" />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    aria-label="Switch to System Mode"
                    value="system"
                    iconType="check"
                  >
                    <Monitor className="size-4 shrink-0" aria-hidden="true" />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubMenuContent>
            </DropdownMenuSubMenu>
          </DropdownMenuGroup>

          <DropdownMenuGroup>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="py-1.5 w-full hover:bg-gray-100 hover:dark:bg-gray-900 disabled:opacity-60 flex items-center cursor-pointer justify-between text-sm text-gray-900 dark:text-gray-50 pl-2 pr-1"
            >
              {loggingOut ? "Logging out..." : "LogOut"}
              <LogOut className="size-4 text-gray-500" />
            </button>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function DropdownTheme({ children, align = "start" }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => {
              setTheme(value);
            }}
          >
            <DropdownMenuRadioItem
              aria-label="Switch to Light Mode"
              value="light"
              iconType="check"
            >
              <Sun className="size-4 shrink-0" aria-hidden="true" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              aria-label="Switch to Dark Mode"
              value="dark"
              iconType="check"
            >
              <Moon className="size-4 shrink-0" aria-hidden="true" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              aria-label="Switch to System Mode"
              value="system"
              iconType="check"
            >
              <Monitor className="size-4 shrink-0" aria-hidden="true" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

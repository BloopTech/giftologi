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
} from "../../Dropdown";
import { ArrowUpRight, Globe, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";



export function DropdownUserProfile({ children, align = "start" }) {
  const { userData, refreshUserData, isLoading } = useUser();
  const [isPending, startTransition] = useTransition();
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
          <DropdownMenuLabel>Gift</DropdownMenuLabel>
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
          <DropdownMenuGroup className="flex lg:hidden w-full">
            <DropdownMenuSubMenu>


              <DropdownMenuSubMenuContent>
                {items.map(({ value, label }) => (
                  <DropdownMenuRadioGroup
                    key={value}
                    value={value}
                    onValueChange={() => handleLanguageChange(value)}
                    defaultValue={value}
                  >
                    <DropdownMenuRadioItem
                      aria-label="Select language"
                      value={locale}
                      iconType="check"
                    >
                      {label}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                ))}
              </DropdownMenuSubMenuContent>
            </DropdownMenuSubMenu>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          {/* <DropdownMenuGroup>
            <LogoutButton className="py-1.5 w-full hover:bg-gray-100 hover:dark:bg-gray-900 flex items-center cursor-pointer justify-between text-sm text-gray-900 dark:text-gray-50 pl-2 pr-1">
              Signout
              <LogOut className="size-4 text-gray-500" />
            </LogoutButton>
          </DropdownMenuGroup> */}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function DropdownTheme({ children, align = "start" }) {
  const tNav = useTranslations("Navigation");
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
              {tNav("theme.light")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              aria-label="Switch to Dark Mode"
              value="dark"
              iconType="check"
            >
              <Moon className="size-4 shrink-0" aria-hidden="true" />
              {tNav("theme.dark")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              aria-label="Switch to System Mode"
              value="system"
              iconType="check"
            >
              <Monitor className="size-4 shrink-0" aria-hidden="true" />
              {tNav("theme.system")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

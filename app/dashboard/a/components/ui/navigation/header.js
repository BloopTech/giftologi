"use client";
import React, { useState, useTransition, useEffect } from "react";
import { Globe, Check } from "lucide-react";
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


export default function Header() {


  // Add state to control the switch
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  
  return (
    <nav className="fixed left-0 top-0 z-10 w-full hidden lg:inline-block">
      
    </nav>
  );
}


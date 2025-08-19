"use client";

import {
  House,
  Settings,
  CreditCard,
  User,
  UserCheck,
  ReceiptText,
  Link2,
} from "lucide-react";

export const useNavigationData = () => {
  return [
    {
      label: "",
      id: 1,
      items: [
        { name: "Home", href: "/dashboard/h", icon: House, other_items: [] },
      ],
    },
    {
      label: "",
      id: 2,
      items: [
        {
          name: "Profile",
          href: "/dashboard/h/profile",
          icon: House,
          other_items: [],
        },
      ],
    },
  ];
};

// Export a static version of the navigation for components that can't use hooks
export const navigation = [
  {
    label: "",
    id: 1,
    items: [
      { name: "Home", href: "/dashboard/h", icon: House, other_items: [] },
    ],
  },
  {
    label: "",
    id: 2,
    items: [
      {
        name: "Profile",
        href: "/dashboard/h/profile",
        icon: User,
        other_items: [],
      },
    ],
  },
];

"use client";

import {
  PiCardholder,
  PiChartBar,
  PiFiles,
  PiFolders,
  PiLog,
  PiPackage,
  PiReceipt,
  PiShoppingBagOpen,
  PiStorefront,
  PiUsers,
} from "react-icons/pi";

export const useNavigationData = () => {
  return [
    {
      label: "",
      id: 1,
      items: [
        {
          name: "Dashboard",
          href: "/dashboard/v",
          icon: PiUsers,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 2,
      items: [
        {
          name: "Products",
          href: "/dashboard/v/products",
          icon: PiShoppingBagOpen,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 3,
      items: [
        {
          name: "Payouts",
          href: "/dashboard/v/payouts",
          icon: PiStorefront,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 4,
      items: [
        {
          name: "Analytics",
          href: "/dashboard/v/analytics",
          icon: PiPackage,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 5,
      items: [
        {
          name: "Profile",
          href: "/dashboard/v/profile",
          icon: PiShoppingBagOpen,
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
      {
        name: "Dashboard",
        href: "/dashboard/v",
        icon: PiUsers,
        other_items: [],
      },
    ],
  },
  {
    label: "",
    id: 2,
    items: [
      {
        name: "Products",
        href: "/dashboard/v/products",
        icon: PiShoppingBagOpen,
        other_items: [],
      },
    ],
  },
  {
    label: "",
    id: 3,
    items: [
      {
        name: "Payouts",
        href: "/dashboard/v/payouts",
        icon: PiStorefront,
        other_items: [],
      },
    ],
  },
  {
    label: "",
    id: 4,
    items: [
      {
        name: "Analytics",
        href: "/dashboard/v/analytics",
        icon: PiPackage,
        other_items: [],
      },
    ],
  },
  {
    label: "",
    id: 5,
    items: [
      {
        name: "Profile",
        href: "/dashboard/v/profile",
        icon: PiShoppingBagOpen,
        other_items: [],
      },
    ],
  },
];

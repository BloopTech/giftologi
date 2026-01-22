"use client";

import {
  ChartColumn,
  DollarSign,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Package,
} from "lucide-react";

export const useNavigationData = () => {
  return [
    {
      label: "",
      id: 1,
      items: [
        {
          name: "Dashboard",
          href: "/dashboard/v",
          icon: LayoutDashboard,
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
          icon: Package,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 3,
      items: [
        {
          name: "Orders",
          href: "/dashboard/v/orders",
          icon: ShoppingCart,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 4,
      items: [
        {
          name: "Payouts",
          href: "/dashboard/v/payouts",
          icon: DollarSign,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 5,
      items: [
        {
          name: "Analytics",
          href: "/dashboard/v/analytics",
          icon: ChartColumn,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 6,
      items: [
        {
          name: "Profile",
          href: "/dashboard/v/profile",
          icon: Settings,
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
        icon: LayoutDashboard,
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
        icon: Package,
        other_items: [],
      },
    ],
  },
  {
    label: "",
    id: 3,
    items: [
      {
        name: "Orders",
        href: "/dashboard/v/orders",
        icon: ShoppingCart,
        other_items: [],
      },
    ],
  },
  {
    label: "",
    id: 4,
    items: [
      {
        name: "Payouts",
        href: "/dashboard/v/payouts",
        icon: DollarSign,
        other_items: [],
      },
    ],
  },
  {
    label: "",
    id: 5,
    items: [
      {
        name: "Analytics",
        href: "/dashboard/v/analytics",
        icon: ChartColumn,
        other_items: [],
      },
    ],
  },
  {
    label: "",
    id: 6,
    items: [
      {
        name: "Profile",
        href: "/dashboard/v/profile",
        icon: Settings,
        other_items: [],
      },
    ],
  },
];

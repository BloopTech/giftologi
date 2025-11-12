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
        {
          name: "Manage Roles",
          href: "/dashboard/s_a/roles",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 2,
      items: [
        {
          name: "Open Registry List",
          href: "/dashboard/s_a/registry_list",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 3,
      items: [
        {
          name: "Vendor Requests",
          href: "/dashboard/s_a/vendor_requests",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 4,
      items: [
        {
          name: "Manage Products",
          href: "/dashboard/s_a/products",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 5,
      items: [
        {
          name: "View Transactions",
          href: "/dashboard/s_a/transactions",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 6,
      items: [
        {
          name: "View Payouts",
          href: "/dashboard/s_a/payouts",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 7,
      items: [
        {
          name: "Generate Reports",
          href: "/dashboard/s_a/reports",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 8,
      items: [
        {
          name: "View Activity Log",
          href: "/dashboard/s_a/activity_log",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 9,
      items: [
        {
          name: "API Documentation",
          href: "/dashboard/s_a/api_documentation",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 10,
      items: [
        {
          name: "Analytics & Reporting",
          href: "/dashboard/s_a/analytics_reporting",
          icon: House,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 11,
      items: [
        {
          name: "Content & Policy Pages",
          href: "/dashboard/s_a/content_policy_pages",
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
      { name: "Home", href: "/dashboard/s_a", icon: House, other_items: [] },
    ],
  },
  {
    label: "",
    id: 2,
    items: [
      {
        name: "Profile",
        href: "/dashboard/s_a/profile",
        icon: User,
        other_items: [],
      },
    ],
  },
];

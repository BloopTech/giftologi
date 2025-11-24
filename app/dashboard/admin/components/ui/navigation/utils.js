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
          href: "/dashboard/admin/roles",
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
          href: "/dashboard/admin/registry_list",
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
          href: "/dashboard/admin/vendor_requests",
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
          href: "/dashboard/admin/products",
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
          href: "/dashboard/admin/transactions",
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
          href: "/dashboard/admin/payouts",
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
          href: "/dashboard/admin/reports",
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
          href: "/dashboard/admin/activity_log",
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
          href: "/dashboard/admin/api_documentation",
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
          href: "/dashboard/admin/analytics_reporting",
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
          href: "/dashboard/admin/content_policy_pages",
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
      { name: "Home", href: "/dashboard/admin", icon: House, other_items: [] },
    ],
  },
  {
    label: "",
    id: 2,
    items: [
      {
        name: "Profile",
        href: "/dashboard/admin/profile",
        icon: User,
        other_items: [],
      },
    ],
  },
];

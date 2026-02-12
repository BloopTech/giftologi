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
  PiTag,
  PiUsers,
  PiScales,
} from "react-icons/pi";

const filterNavigationByRole = (navigation, role) => {
  if (!role) return navigation;

  const normalized = String(role || "").toLowerCase();

  // super_admin sees everything — skip filtering
  if (normalized === "super_admin") return navigation;

  // Permissions matrix per admin.md:
  // operations_manager_admin → Vendors, Products, Orders (transactions), Reports, Registry
  // finance_admin            → Orders (transactions), Payouts, Reports
  // customer_support_admin   → Support Tickets (activity log as proxy)
  // store_manager_admin      → Products only
  // marketing_admin          → Analytics, Content/Policy, Promo Codes
  const allowedByRole = {
    operations_manager_admin: new Set([
      "/dashboard/admin/vendor_requests",
      "/dashboard/admin/close_requests",
      "/dashboard/admin/vendor_categories",
      "/dashboard/admin/products",
      "/dashboard/admin/registry_list",
      "/dashboard/admin/transactions",
      "/dashboard/admin/disputes",
      "/dashboard/admin/reports",
      "/dashboard/admin/promo_codes",
      "/dashboard/admin/analytics_reporting",
    ]),
    finance_admin: new Set([
      "/dashboard/admin/transactions",
      "/dashboard/admin/payouts",
      "/dashboard/admin/reports",
    ]),
    customer_support_admin: new Set([
      "/dashboard/admin/registry_list",
      "/dashboard/admin/disputes",
      "/dashboard/admin/activity_log",
      "/dashboard/admin/all_users",
    ]),
    store_manager_admin: new Set(["/dashboard/admin/products"]),
    marketing_admin: new Set([
      "/dashboard/admin/analytics_reporting",
      "/dashboard/admin/content_policy_pages",
      "/dashboard/admin/promo_codes",
    ]),
  };

  const allowed = allowedByRole[normalized];
  if (!allowed) return navigation;

  return (navigation || [])
    .map((group) => {
      const filteredItems = (group.items || []).filter((item) =>
        allowed.has(item.href),
      );
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items && group.items.length);
};

export const useNavigationData = (role) => {
  const navigation = [
    {
      label: "",
      id: 1,
      items: [
        {
          name: "Manage Roles",
          href: "/dashboard/admin/roles",
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
          name: "Open Registry List",
          href: "/dashboard/admin/registry_list",
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
          name: "Vendor Requests",
          href: "/dashboard/admin/vendor_requests",
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
          name: "Close Shop Requests",
          href: "/dashboard/admin/close_requests",
          icon: PiStorefront,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 5,
      items: [
        {
          name: "Vendor Categories",
          href: "/dashboard/admin/vendor_categories",
          icon: PiFolders,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 6,
      items: [
        {
          name: "Manage Products",
          href: "/dashboard/admin/products",
          icon: PiPackage,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 7,
      items: [
        {
          name: "Promo Codes",
          href: "/dashboard/admin/promo_codes",
          icon: PiTag,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 8,
      items: [
        {
          name: "View Transactions",
          href: "/dashboard/admin/transactions",
          icon: PiShoppingBagOpen,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 16,
      items: [
        {
          name: "Disputes",
          href: "/dashboard/admin/disputes",
          icon: PiScales,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 9,
      items: [
        {
          name: "Payouts",
          href: "/dashboard/admin/payouts",
          icon: PiCardholder,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 10,
      items: [
        {
          name: "Generate Reports",
          href: "/dashboard/admin/reports",
          icon: PiReceipt,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 11,
      items: [
        {
          name: "View Activity Log",
          href: "/dashboard/admin/activity_log",
          icon: PiLog,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 12,
      items: [
        {
          name: "API Documentation",
          href: "/dashboard/admin/api_documentation",
          icon: PiFiles,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 13,
      items: [
        {
          name: "Analytics & Reporting",
          href: "/dashboard/admin/analytics_reporting",
          icon: PiChartBar,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 14,
      items: [
        {
          name: "Content & Policy Pages",
          href: "/dashboard/admin/content_policy_pages",
          icon: PiFolders,
          other_items: [],
        },
      ],
    },
    {
      label: "",
      id: 15,
      items: [
        {
          name: "All Users",
          href: "/dashboard/admin/all_users",
          icon: PiUsers,
          other_items: [],
        },
      ],
    },
  ];

  return filterNavigationByRole(navigation, role);
};

// Export a static version of the navigation for components that can't use hooks
export const navigation = [
  {
    label: "",
    id: 1,
    items: [
      {
        name: "Home",
        href: "/dashboard/admin",
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
        name: "Profile",
        href: "/dashboard/admin/profile",
        icon: PiUsers,
        other_items: [],
      },
    ],
  },
];

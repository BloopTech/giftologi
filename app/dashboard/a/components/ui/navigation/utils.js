"use client";

import {
  House,
  Settings,
  CreditCard,
  User,
  Users,
  ReceiptText,
  Link2,
  Store,
  ShoppingCart,
  BarChart3,
  OctagonAlert,
  FileText,
} from "lucide-react";

export const useNavigationData = () => {
  return [
    {
      label: "Overview",
      id: 1,
      items: [
        { name: "Home", href: "/dashboard/a", icon: House, other_items: [] },
      ],
    },
    {
      label: "Management",
      id: 2,
      items: [
        {
          name: "Users",
          href: "/dashboard/a/users",
          icon: Users,
          other_items: [],
        },
        {
          name: "Vendors",
          href: "/dashboard/a/vendors",
          icon: Store,
          other_items: [],
        },
        {
          name: "Orders",
          href: "/dashboard/a/orders",
          icon: ReceiptText,
          other_items: [],
        },
        {
          name: "Disputes",
          href: "/dashboard/a/disputes",
          icon: OctagonAlert,
          other_items: [],
        },
      ],
    },
    {
      label: "Content & Team",
      id: 3,
      items: [
        {
          name: "Content",
          href: "/dashboard/a/content",
          icon: FileText,
          other_items: [],
        },
        {
          name: "Team",
          href: "/dashboard/a/team",
          icon: Users,
          other_items: [],
        },
        {
          name: "Configuration",
          href: "/dashboard/a/config",
          icon: Settings,
          other_items: [],
        },
      ],
    },
    {
      label: "Insights",
      id: 4,
      items: [
        {
          name: "Revenue & Commission",
          href: "/dashboard/a/revenue",
          icon: CreditCard,
          other_items: [],
        },
        {
          name: "Analytics",
          href: "/dashboard/a/analytics",
          icon: BarChart3,
          other_items: [],
        },
      ],
    },
  ];
};

// Export a static version of the navigation for components that can't use hooks
export const navigation = [
  {
    label: "Overview",
    id: 1,
    items: [
      { name: "Home", href: "/dashboard/a", icon: House, other_items: [] },
    ],
  },
  {
    label: "Management",
    id: 2,
    items: [
      { name: "Users", href: "/dashboard/a/users", icon: Users, other_items: [] },
      { name: "Vendors", href: "/dashboard/a/vendors", icon: Store, other_items: [] },
      { name: "Orders", href: "/dashboard/a/orders", icon: ReceiptText, other_items: [] },
      { name: "Disputes", href: "/dashboard/a/disputes", icon: OctagonAlert, other_items: [] },
    ],
  },
  {
    label: "Content & Team",
    id: 3,
    items: [
      { name: "Content", href: "/dashboard/a/content", icon: FileText, other_items: [] },
      { name: "Team", href: "/dashboard/a/team", icon: Users, other_items: [] },
      { name: "Configuration", href: "/dashboard/a/config", icon: Settings, other_items: [] },
    ],
  },
  {
    label: "Insights",
    id: 4,
    items: [
      { name: "Revenue & Commission", href: "/dashboard/a/revenue", icon: CreditCard, other_items: [] },
      { name: "Analytics", href: "/dashboard/a/analytics", icon: BarChart3, other_items: [] },
    ],
  },
];

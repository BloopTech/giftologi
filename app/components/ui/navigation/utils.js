"use client";

import { PiBezierCurve } from "react-icons/pi";
import {
  House,
  Settings,
  CreditCard,
  User,
  UserCheck,
  ReceiptText,
  Link2,
} from "lucide-react";
import { useTranslations } from "next-intl";

export const useNavigationData = () => {
  const t = useTranslations("Navigation");
  
  return [
    {
      label: "",
      id: 1,
      items: [{ name: t("items.home"), href: "/dashboard", icon: House, other_items: [] }],
    },
    {
      label: t("sections.payments"),
      id: 2,
      items: [
        {
          name: t("items.payments"),
          href: "/dashboard/payments",
          icon: CreditCard,
          other_items: []
        },
        { name: t("items.customer"), href: "/dashboard/payments/customer", icon: User, other_items: [] },
        {
          name: t("items.settlements"),
          href: "/dashboard/payments/settlements",
          icon: ReceiptText,
          other_items: []
        },
        {
          name: t("items.splitRules"),
          href: "/dashboard/payments/split-rules",
          icon: PiBezierCurve,
          other_items: []
        },
        {
          name: t("items.kyc"),
          href: "/dashboard/payments/kyc",
          icon: UserCheck,
          other_items: []
        },
      ],
    },
    {
      label: t("sections.collections"),
      id: 3,
      items: [
        {
          name: t("items.paymentLinks"),
          href: "/dashboard/collections/payment-links",
          icon: Link2,
          other_items: []
        },
        // {
        //   name: t("items.invoices"),
        //   href: "/dashboard/collections/invoices",
        //   icon: ReceiptText,
        //   other_items: []
        // },
        // {
        //   name: t("items.recurring"),
        //   href: "/dashboard/collections/recurring-payments",
        //   icon: ReceiptText,
        //   other_items: []
        // },
      ],
    },
    {
      label: t("sections.account"),
      id: 4,
      items: [
        {
          name: t("items.settings"),
          href: "",
          icon: Settings,
          other_items: [
            {
              name: t("items.api"),
              href: "/dashboard/account/settings/api",
              icon: "",
            },
            {
              name: t("items.webhooks"),
              href: "/dashboard/account/settings/webhooks",
              icon: "",
            },
            {
              name: t("items.userManagement"),
              href: "/dashboard/account/settings/user-management",
              icon: "",
            },
            {
              name: t("items.checkoutConfiguration"),
              href: "/dashboard/account/settings/checkout-configuration",
              icon: "",
            },
            {
              name: t("items.checkoutCustomization"),
              href: "/dashboard/account/settings/checkout-customization",
              icon: "",
            },
          ],
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
    items: [{ name: "Home", href: "/dashboard", icon: House, other_items: [] }],
  },
  {
    label: "PAYMENTS",
    id: 2,
    items: [
      {
        name: "Payments",
        href: "/dashboard/payments",
        icon: CreditCard,
        other_items: []
      },
      { name: "Customer", href: "/dashboard/payments/customer", icon: User, other_items: [] },
      {
        name: "Settlements",
        href: "/dashboard/payments/settlements",
        icon: ReceiptText,
        other_items: []
      },
      {
        name: "Split Rules",
        href: "/dashboard/payments/split-rules",
        icon: PiBezierCurve,
        other_items: []
      },
      {
        name: "KYC",
        href: "/dashboard/payments/kyc",
        icon: UserCheck,
        other_items: []
      },
    ],
  },
  {
    label: "COLLECTIONS",
    id: 3,
    items: [
      {
        name: "Payment Links",
        href: "/dashboard/collections/payment-links",
        icon: Link2,
        other_items: []
      },
      // {
      //   name: "Invoices",
      //   href: "/dashboard/collections/invoices",
      //   icon: ReceiptText,
      //   other_items: []
      // },
      // {
      //   name: "Recurring",
      //   href: "/dashboard/collections/recurring-payments",
      //   icon: ReceiptText,
      //   other_items: []
      // },
    ],
  },
  {
    label: "ACCOUNT",
    id: 4,
    items: [
      {
        name: "Settings",
        href: "",
        icon: Settings,
        other_items: [
          {
            name: "API",
            href: "/dashboard/account/settings/api",
            icon: "",
          },
          {
            name: "Webhooks",
            href: "/dashboard/account/settings/webhooks",
            icon: "",
          },
          {
            name: "User Management",
            href: "/dashboard/account/settings/user-management",
            icon: "",
          },
          {
            name: "Checkout Configuration",
            href: "/dashboard/account/settings/checkout-configuration",
            icon: "",
          },
          {
            name: "Checkout Customization",
            href: "/dashboard/account/settings/checkout-customization",
            icon: "",
          },
        ],
      },
    ],
  },
];

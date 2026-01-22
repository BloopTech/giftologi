"use client";
import {
  PiArrowRight,
  PiChartBar,
  PiFile,
  PiFolder,
  PiInfo,
  PiLog,
  PiPackage,
  PiReceipt,
  PiShoppingBagOpen,
  PiStorefront,
  PiUser,
} from "react-icons/pi";


export const overviewModules = [
  {
    id: 1,
    name: "Manage Roles",
    description: "Create, assign, or revoke staff roles and permissions",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiUser,
      bottom: PiArrowRight,
    },
  },
  {
    id: 2,
    name: "Open Registry List",
    description: "View and manage all registries on the platform",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiShoppingBagOpen,
      bottom: PiArrowRight,
    },
  },
  {
    id: 3,
    name: "View Requests (Vendor Approvals)",
    description: "Approve or reject vendor applications",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiStorefront,
      bottom: PiArrowRight,
    },
  },
  {
    id: 4,
    name: "Manage Products",
    description: "View and manage product catalog and inventory",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Store Manager",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiPackage,
      bottom: PiArrowRight,
    },
  },
  {
    id: 5,
    name: "View Transactions",
    description: "View and manage all registries on the platform",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiShoppingBagOpen,
      bottom: PiArrowRight,
    },
  },
  {
    id: 6,
    name: "View Payouts (Approve Payouts)",
    description: "Approve or reject vendor applications",
    buttons: [
      {
        name: "Finance",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiStorefront,
      bottom: PiArrowRight,
    },
  },
  {
    id: 7,
    name: "Generate Reports",
    description: "Export summary reports (PDF/CSV)",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },

      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },

      {
        name: "Finance",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },

      {
        name: "Customer Service",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiReceipt,
      bottom: PiArrowRight,
    },
  },
  {
    id: 8,
    name: "View Activity Log",
    description: "Track admin actions, approvals, and suspensions",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiLog,
      bottom: PiArrowRight,
    },
  },
  {
    id: 9,
    name: "Manage Support Tickets",
    description: "Assign, escalate, or close support tickets",
    buttons: [
      {
        name: "Customer Support",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Disabled",
        color:
          "text-[8px] cursor-pointer bg-white text-[#D4183D] border border-[#D4183D] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiInfo,
    },
  },
  {
    id: 10,
    name: "API Documentation",
    description: "View database schema, endpoints, and system behaviour",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiFile,
      bottom: PiArrowRight,
    },
  },
  {
    id: 11,
    name: "Analytics & Reporting",
    description: "Track platform performance, vendors, and user engagement",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Finance",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Marketing",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiChartBar,
      bottom: PiArrowRight,
    },
  },
  {
    id: 12,
    name: "Content & Policy Pages",
    description: "Manage static pages, email templates, and FAQs",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-primary text-white border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Customer Support",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Marketing",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiFolder,
      bottom: PiArrowRight,
    },
  },
];
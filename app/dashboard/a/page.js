"use server";
import React from "react";
import { createClient } from "../../utils/supabase/server";
import Link from "next/link";
import {
  Users,
  Store,
  ReceiptText,
  OctagonAlert,
  FileText,
  Settings,
  CreditCard,
  BarChart3,
} from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  return (
    <div className="dark:text-white bg-[#FFFFFF] dark:bg-gray-950 lg:pl-10 pl-5 pr-5 lg:pr-0">
      <div className="flex flex-col gap-6">
        <div className="mt-2">
          <h1 className="text-xl md:text-2xl font-semibold text-[#2D3436] dark:text-white">
            Welcome back, {profile?.firstname}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-gray-300">
            Admin control center. Manage users, vendors, orders, content, and insights.
          </p>
        </div>

        <section aria-label="Quick links" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[
            { title: "Users", href: "/dashboard/a/users", icon: Users, desc: "Manage and moderate users" },
            { title: "Vendors", href: "/dashboard/a/vendors", icon: Store, desc: "Approve and manage vendors" },
            { title: "Orders", href: "/dashboard/a/orders", icon: ReceiptText, desc: "Oversee orders" },
            { title: "Disputes", href: "/dashboard/a/disputes", icon: OctagonAlert, desc: "Resolve issues" },
            { title: "Content", href: "/dashboard/a/content", icon: FileText, desc: "Manage content" },
            { title: "Team", href: "/dashboard/a/team", icon: Users, desc: "Add and manage team" },
            { title: "Configuration", href: "/dashboard/a/config", icon: Settings, desc: "System settings" },
            { title: "Revenue", href: "/dashboard/a/revenue", icon: CreditCard, desc: "Track commissions" },
            { title: "Analytics", href: "/dashboard/a/analytics", icon: BarChart3, desc: "View insights" },
          ].map(({ title, href, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              aria-label={`${title} – ${desc}`}
              className="group rounded-xl border border-[#f4f4f4] bg-[#FFFCEF] hover:bg-white transition shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BBA96C] dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-800 p-4 flex items-start gap-3"
            >
              <span className="inline-flex items-center justify-center rounded-md p-2 bg-[#BBA96C] text-white dark:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-[#2D3436] group-hover:text-[#85753C] dark:text-white">
                  {title}
                </span>
                <span className="text-xs text-[#6B7280] dark:text-gray-300">{desc}</span>
              </span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
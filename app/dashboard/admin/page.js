"use server";
import React from "react";
import SuperAdminDashboardContent from "./content";
import { DashboardProvider } from "./context";

export default async function SuperAdminDashboardPage() {
  return (
    <div className="lg:pl-10 lg:pr-0 pl-5 pr-5 pb-[5rem]">
      <DashboardProvider>
        <SuperAdminDashboardContent />
      </DashboardProvider>
    </div>
  );
}

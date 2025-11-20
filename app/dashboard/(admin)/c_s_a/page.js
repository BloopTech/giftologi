"use server";
import React from "react";
import CustomerSupportAdminDashboardContent from "./content";



export default async function CustomerSupportAdminDashboardPage() {
    return (
        <div className="lg:pl-10 lg:pr-0 pl-5 pr-5 pb-[5rem]">
            <CustomerSupportAdminDashboardContent />
        </div>
    )
}
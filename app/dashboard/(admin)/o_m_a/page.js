"use server";
import React from "react";
import OperationsManagerDashboardContent from "./content";



export default async function OperationsManagerDashboardPage() {
    return (
        <div className="lg:pl-10 lg:pr-0 pl-5 pr-5 pb-[5rem]">
            <OperationsManagerDashboardContent />
        </div>
    )
}
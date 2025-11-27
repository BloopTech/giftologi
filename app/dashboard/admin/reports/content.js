"use client";
import React from "react";

export default function GenerateReportsContent() {
  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
      <div className="flex flex-col w-full">
        <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
          Generate Reports
        </h1>
        <span className="text-[#717182] text-xs/4 font-poppins">
          Export summary reports (PDF/CSV).
        </span>
      </div>
    </div>
  );
}

"use client";
import React from "react";

export default function AllUsersContent() {
  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            All Users
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            View all users.
          </span>
        </div>
      </div>
    </div>
  );
}

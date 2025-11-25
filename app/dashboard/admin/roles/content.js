"use client";
import React, { useState } from "react";
import { Search, Plus } from "lucide-react";
import { cx } from "@/app/components/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import StaffMembersTable from "./StaffMembersTable";
import SystemRolesTable from "./SystemRolesTable";
import PermissionsTable from "./PermissionsTable";
import AddStaffDialog from "../components/AddStaffDialog";
import { useRolesContext } from "./context";
import { useDashboardContext } from "../context";

export default function RolesContent() {
  const rolesContext = useRolesContext() || {};
  const {addStaffOpen, setAddStaffOpen} = useDashboardContext();
  const { staffSearchTerm, setStaffSearchTerm, setStaffPage } = rolesContext;
  const [activeSegment, setActiveSegment] = useState("staff-members");
  const [search, setSearch] = useState(staffSearchTerm || "");

  let TableComponent = StaffMembersTable;
  if (activeSegment === "system-roles") {
    TableComponent = SystemRolesTable;
  } else if (activeSegment === "permissions") {
    TableComponent = PermissionsTable;
  }

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Manage Roles
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Create, assign, or revoke staff roles and permissions.
          </span>
        </div>
        <>
          <button
            type="button"
            onClick={() => setAddStaffOpen(true)}
            className="px-5 py-2.5 inline-flex items-center justify-center border border-[#427ED3] text-[#427ED3] bg-white text-xs rounded-full cursor-pointer hover:text-white hover:bg-[#427ED3] gap-1"
          >
            <Plus className="size-4" />
            <span>Add Staff</span>
          </button>
          <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
                  Add New Staff Member
                </DialogTitle>
              </DialogHeader>
              <AddStaffDialog onClose={() => setAddStaffOpen(false)} />
            </DialogContent>
          </Dialog>
        </>
      </div>

      <div className="flex items-center justify-start mt-1">
        <div className="inline-flex rounded-full bg-[#F1F2F6] p-1 gap-1">
          {[
            { label: "Staff Members", value: "staff-members" },
            { label: "System Roles", value: "system-roles" },
            { label: "Permissions", value: "permissions" },
          ].map(({ label, value }) => {
            const isActive = activeSegment === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setActiveSegment(value)}
                className={cx(
                  "px-4 py-2 text-xs font-medium rounded-full cursor-pointer transition-colors",
                  isActive
                    ? "bg-white text-[#0A0A0A] shadow-sm"
                    : "text-[#717182]"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                activeSegment === "permissions"
                  ? "Search permissions..."
                  : activeSegment === "system-roles"
                  ? "Search roles..."
                  : "Search all users here..."
              }
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setStaffSearchTerm?.(search);
            setStaffPage?.(0);
          }}
          className="px-8 py-2.5 inline-flex items-center justify-center rounded-full bg-[#3979D2] text-white text-xs font-medium border border-[#3979D2] cursor-pointer hover:bg-white hover:text-[#3979D2]"
        >
          Search
        </button>
      </div>

      <TableComponent searchQuery={search} />
    </div>
  );
}
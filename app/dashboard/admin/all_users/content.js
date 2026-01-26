"use client";
import React from "react";
import { Search } from "lucide-react";
import { useAllUsersContext } from "./context";
import AllUsersTable from "./AllUsersTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";

export default function AllUsersContent() {
  const {
    searchTerm,
    setSearchTerm,
    setUsersPage,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
  } = useAllUsersContext() || {};

  const [search, setSearch] = React.useState(searchTerm || "");

  React.useEffect(() => {
    setSearch(searchTerm || "");
  }, [searchTerm]);

  const handleSearch = () => {
    if (!setSearchTerm || !setUsersPage) return;
    setSearchTerm(search);
    setUsersPage(0);
  };

  return (
    <section aria-label="All users management" className="flex flex-col space-y-4 w-full mb-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            All Users
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Search and filter across all hosts, guests, vendors, and admins.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-2 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={"Search by name or email"}
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>
        <div className="w-full md:w-[18%]">
          <Select
            value={roleFilter || "all"}
            onValueChange={(value) => {
              setRoleFilter?.(value);
              setUsersPage?.(0);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="host">Hosts</SelectItem>
              <SelectItem value="vendor">Vendors</SelectItem>
              <SelectItem value="guest">Guests</SelectItem>
              <SelectItem value="admin">Admins / Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[18%]">
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => {
              setStatusFilter?.(value);
              setUsersPage?.(0);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="w-full md:w-auto px-8 py-2.5 inline-flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium border border-primary cursor-pointer hover:bg-white hover:text-primary"
        >
          Search
        </button>
      </div>

      <AllUsersTable />
    </section>
  );
}

"use client";
import React from "react";
import RolesContent from "./content";
import { RolesProvider } from "./context";

export default function Roles() {
  return (
    <div className="lg:pl-10 lg:pr-0 pl-5 pr-5 pb-[5rem]">
      <RolesProvider>
        <RolesContent />
      </RolesProvider>
    </div>
  );
}

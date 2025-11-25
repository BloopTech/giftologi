"use server";
import React from "react";
import RolesContent from "./content";
import { RolesProvider } from "./context";

export default async function Roles() {
  return (
    <>
      <RolesProvider>
        <RolesContent />
      </RolesProvider>
    </>
  );
}

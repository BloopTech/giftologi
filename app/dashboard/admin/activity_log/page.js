"use server";
import React from "react";
import { ActivityLogProvider } from "./context";
import ActivityLogContent from "./content";

export default async function ActivityLog() {
  return (
    <>
      <ActivityLogProvider>
        <ActivityLogContent />
      </ActivityLogProvider>
    </>
  );
}

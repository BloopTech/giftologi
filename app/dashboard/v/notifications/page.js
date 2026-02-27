"use server";

import React from "react";
import NotificationsCenterPage from "@/app/components/notifications/NotificationsCenterPage";

export default async function VendorNotificationsPage() {
  return (
    <NotificationsCenterPage
      role="vendor"
      title="Vendor Notifications"
      allowArchive
    />
  );
}

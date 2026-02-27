"use server";

import React from "react";
import NotificationsCenterPage from "@/app/components/notifications/NotificationsCenterPage";

export default async function HostNotificationsPage() {
  return (
    <NotificationsCenterPage
      role="host"
      title="Host Notifications"
      allowArchive
    />
  );
}

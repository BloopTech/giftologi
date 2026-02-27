"use server";

import React from "react";
import NotificationsCenterPage from "@/app/components/notifications/NotificationsCenterPage";

export default async function AdminNotificationsPage() {
  return <NotificationsCenterPage role="admin" title="Admin Notifications" />;
}

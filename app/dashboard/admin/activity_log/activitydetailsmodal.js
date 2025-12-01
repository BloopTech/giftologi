"use client";

import React from "react";

export default function ActivityDetailsModal({ open, onClose, activity }) {
  if (!open || !activity) return null;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const rows = [
    { label: "Timestamp", value: activity.timestampLabel },
    { label: "Admin name", value: activity.adminName || activity.adminEmail },
    { label: "Admin email", value: activity.adminEmail },
    { label: "Action", value: activity.actionLabel },
    { label: "Entity", value: activity.entity },
    { label: "Target ID", value: activity.targetId },
    { label: "Details", value: activity.details },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-lg border border-[#D6D6D6] p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[#0A0A0A]">
            Activity details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-[#3979D2] hover:underline"
          >
            Close
          </button>
        </div>

        <div className="space-y-2 text-xs text-[#0A0A0A]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4"
            >
              <span className="min-w-[90px] text-[#717182]">
                {row.label}
              </span>
              <span className="flex-1 text-right">
                {row.value || ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

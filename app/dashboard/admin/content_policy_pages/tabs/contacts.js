"use client";
import React, { useState } from "react";
import { Plus, Eye, Pencil } from "lucide-react";
import { tv } from "tailwind-variants";
import { cx } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import EditContactSettingsDialog from "../dialogs/EditContactSettingsDialog";
import ViewContactSubmissionDialog from "../dialogs/ViewContactSubmissionDialog";

export default function ContactInfoTab(props) {
  const {
    currentTab,
    contactSettingsValue,
    isLoading,
    contactSubmissionRows,
    focusId,
    focusEntity,
    setFocusId,
    setFocusEntity,
    makeFocusDomId,
    formatDate,
    wrapper,
    table,
    headRow,
    headCell,
    bodyRow,
    bodyCell,
  } = props;

  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [viewSubmissionOpen, setViewSubmissionOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  React.useEffect(() => {
    if (currentTab !== "contact_info") return;
    if (!focusId) return;

    const entityKey = String(focusEntity || "").toLowerCase();

    if (entityKey === "content_contact_settings") {
      if (editSettingsOpen) return;
      setEditSettingsOpen(true);
      setFocusId?.("");
      setFocusEntity?.("");
      return;
    }

    if (entityKey !== "content_contact_submission") return;
    if (viewSubmissionOpen) return;

    const match = (contactSubmissionRows || []).find((row) => row?.id === focusId);
    if (!match) return;

    setSelectedSubmission(match);
    setViewSubmissionOpen(true);
    setFocusId?.("");
    setFocusEntity?.("");
  }, [
    currentTab,
    focusId,
    focusEntity,
    contactSubmissionRows,
    editSettingsOpen,
    viewSubmissionOpen,
    setFocusId,
    setFocusEntity,
  ]);

  const handleEditSettings = () => {
    setEditSettingsOpen(true);
  };

  const handleViewSubmission = (row) => {
    setSelectedSubmission(row || null);
    setViewSubmissionOpen(true);
  };

  return (
    <>
      {currentTab === "contact_info" ? (
        <div className="flex flex-col mt-2 space-y-5">
          <div className="flex flex-col mt-2 space-y-5 rounded-xl border border-[#D6D6D6] bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-xs font-medium text-[#0A0A0A]">
                  Contact Page Management
                </h2>
                <p className="text-[11px] text-[#717182]">
                  Update customer support contact details.
                </p>
              </div>
              <button
                type="button"
                onClick={handleEditSettings}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-primary bg-primary px-4 py-1.5 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
              >
                <Pencil className="size-4" />
                <span>Edit Details</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                id={makeFocusDomId?.(
                  "content_contact_settings",
                  contactSettingsValue?.id || "settings"
                )}
                className="p-4 space-y-1"
              >
                <p className="text-[11px] font-medium text-[#0A0A0A]">
                  Support Email
                </p>
                <p className="text-xs text-[#6A7282]">
                  {contactSettingsValue?.support_email || "—"}
                </p>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-[11px] font-medium text-[#0A0A0A]">
                  Support Phone
                </p>
                <p className="text-xs text-[#6A7282]">
                  {contactSettingsValue?.support_phone || "—"}
                </p>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-[11px] font-medium text-[#0A0A0A]">
                  Office Address
                </p>
                <p className="text-xs text-[#6A7282] whitespace-pre-line">
                  {contactSettingsValue?.office_address || "—"}
                </p>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-[11px] font-medium text-[#0A0A0A]">
                  Business Hours
                </p>
                <p className="text-xs text-[#6A7282] whitespace-pre-line">
                  {contactSettingsValue?.business_hours || "—"}
                </p>
              </div>
              <div className="p-4 space-y-1 md:col-span-2">
                <p className="text-[11px] font-medium text-[#0A0A0A]">
                  WhatsApp Link
                </p>
                <p className="text-xs text-[#3979D2] break-all">
                  {contactSettingsValue?.whatsapp_link || "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col space-y-3 rounded-xl border border-[#D6D6D6] bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-xs font-medium text-[#0A0A0A]">
                  Contact Form Submissions
                </h2>
                <p className="text-[11px] text-[#717182]">
                  Messages submitted via public contact form.
                </p>
              </div>
            </div>

            <div className={cx(wrapper(), "w-full")}>
              <table className={cx(table())}>
                <thead>
                  <tr className={cx(headRow())}>
                    <th className={cx(headCell())}>Name</th>
                    <th className={cx(headCell())}>Email</th>
                    <th className={cx(headCell())}>Subject</th>
                    <th className={cx(headCell())}>Date</th>
                    <th className={cx(headCell())}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-xs text-[#717182]"
                      >
                        Loading submissions...
                      </td>
                    </tr>
                  ) : contactSubmissionRows.length ? (
                    contactSubmissionRows.map((row) => (
                      <tr
                        key={row.id}
                        id={makeFocusDomId?.("content_contact_submission", row.id)}
                        className={
                          cx(bodyRow()) +
                          (focusId &&
                          String(focusEntity || "").toLowerCase() ===
                            "content_contact_submission" &&
                          row.id === focusId
                            ? " bg-[#F3F6FF]"
                            : "")
                        }
                      >
                        <td className={cx(bodyCell())}>
                          <span className="text-xs font-medium text-[#0A0A0A]">
                            {row.name || "—"}
                          </span>
                        </td>
                        <td className={cx(bodyCell())}>
                          <span className="text-xs text-[#6A7282]">
                            {row.email || "—"}
                          </span>
                        </td>
                        <td className={cx(bodyCell())}>
                          <span className="text-xs text-[#0A0A0A]">
                            {row.subject || "—"}
                          </span>
                        </td>
                        <td className={cx(bodyCell())}>
                          <span className="text-xs text-[#6A7282]">
                            {formatDate(row.created_at)}
                          </span>
                        </td>
                        <td className={cx(bodyCell())}>
                          <button
                            type="button"
                            onClick={() => handleViewSubmission(row)}
                            className="inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-2 py-1 text-[11px] text-primary hover:border-primary hover:bg-[#F3F8FF] cursor-pointer"
                          >
                            <Eye className="size-3 mr-1" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-xs text-[#717182]"
                      >
                        No contact form submissions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <EditContactSettingsDialog
        open={editSettingsOpen}
        onOpenChange={setEditSettingsOpen}
      />
      <ViewContactSubmissionDialog
        open={viewSubmissionOpen}
        onOpenChange={setViewSubmissionOpen}
        submission={selectedSubmission}
      />
    </>
  );
}

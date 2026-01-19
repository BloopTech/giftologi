"use client";
import React, { useState } from "react";
import { Plus, Eye, Pencil } from "lucide-react";
import { tv } from "tailwind-variants";
import { cx } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import EditEmailTemplateDialog from "../dialogs/EditEmailTemplateDialog";
import ViewEmailTemplateDialog from "../dialogs/ViewEmailTemplateDialog";

export default function EmailTemplatesTab(props) {
  const {
    emailTemplateRows,
    isLoading,
    emailStatusVariant,
    currentTab,
    focusId,
    focusEntity,
    setFocusId,
    setFocusEntity,
    makeFocusDomId,
    wrapper,
    table,
    headRow,
    headCell,
    bodyRow,
    bodyCell,
  } = props;

  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  React.useEffect(() => {
    if (currentTab !== "email_templates") return;
    if (!focusId) return;
    if (String(focusEntity || "").toLowerCase() !== "content_email_template") return;
    if (viewOpen) return;

    const match = (emailTemplateRows || []).find((row) => row?.id === focusId);
    if (!match) return;

    setSelectedTemplate(match);
    setViewOpen(true);
    setFocusId?.("");
    setFocusEntity?.("");
  }, [currentTab, focusId, focusEntity, emailTemplateRows, viewOpen, setFocusId, setFocusEntity]);

  const handleNew = () => {
    setSelectedTemplate(null);
    setEditOpen(true);
  };

  const handleView = (template) => {
    setSelectedTemplate(template || null);
    setViewOpen(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template || null);
    setEditOpen(true);
  };

  return (
    <>
      {currentTab === "email_templates" ? (
        <div className="flex flex-col mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-xs font-medium text-[#0A0A0A]">
                Email Template Management
              </h2>
              <p className="text-[11px] text-[#717182]">
                Manage automated notification email templates.
              </p>
            </div>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-[#3979D2] bg-[#3979D2] px-4 py-1.5 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
            >
              <Plus className="size-4" />
              <span>New Template</span>
            </button>
          </div>

          <div className={cx(wrapper(), "w-full")}>
            <table className={cx(table())}>
              <thead>
                <tr className={cx(headRow())}>
                  <th className={cx(headCell())}>Template Name</th>
                  <th className={cx(headCell())}>Category</th>
                  <th className={cx(headCell())}>Subject</th>
                  <th className={cx(headCell())}>Recipient Types</th>
                  <th className={cx(headCell())}>Status</th>
                  <th className={cx(headCell())}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-xs text-[#717182]"
                    >
                      Loading email templates...
                    </td>
                  </tr>
                ) : emailTemplateRows.length ? (
                  emailTemplateRows.map((tpl) => (
                    <tr
                      key={tpl.id}
                      id={makeFocusDomId?.("content_email_template", tpl.id)}
                      className={
                        cx(bodyRow()) +
                        (focusId &&
                        String(focusEntity || "").toLowerCase() ===
                          "content_email_template" &&
                        tpl.id === focusId
                          ? " bg-[#F3F6FF]"
                          : "")
                      }
                    >
                      <td className={cx(bodyCell())}>
                        <span className="text-xs font-medium text-[#0A0A0A]">
                          {tpl.name || "Untitled template"}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <span className="text-xs text-[#6A7282]">
                          {tpl.category || "—"}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <span className="text-xs text-[#0A0A0A]">
                          {tpl.subject || "—"}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <span className="text-xs text-[#6A7282]">
                          {tpl.recipient_type || "—"}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <Badge
                          variant={
                            emailStatusVariant[
                              (tpl.status || "").toLowerCase()
                            ] || "neutral"
                          }
                          className="text-[11px] capitalize"
                        >
                          {tpl.status || "inactive"}
                        </Badge>
                      </td>
                      <td className={cx(bodyCell())}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(tpl)}
                            className="inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-2 py-1 text-[11px] text-[#3979D2] hover:border-[#3979D2] hover:bg-[#F3F8FF] cursor-pointer"
                          >
                            <Eye className="size-3 mr-1" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(tpl)}
                            className="inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-2 py-1 text-[11px] text-[#3979D2] hover:border-[#3979D2] hover:bg-[#F3F8FF] cursor-pointer"
                          >
                            <Pencil className="size-3 mr-1" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-xs text-[#717182]"
                    >
                      No email templates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <EditEmailTemplateDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        template={selectedTemplate}
      />
      <ViewEmailTemplateDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        template={selectedTemplate}
      />
    </>
  );
}

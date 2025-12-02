"use client";
import React, { useState } from "react";
import { Plus, Eye, Pencil } from "lucide-react";
import { tv } from "tailwind-variants";
import { cx } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import EditFaqDialog from "../dialogs/EditFaqDialog";
import ViewFaqDialog from "../dialogs/ViewFaqDialog";

export default function FAQsTab(props) {
  const {
    currentTab,
    isLoading,
    faqRows,
    visibilityVariant,
    wrapper,
    table,
    headRow,
    headCell,
    bodyRow,
    bodyCell,
  } = props;

  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState(null);

  const handleNew = () => {
    setSelectedFaq(null);
    setEditOpen(true);
  };

  const handleView = (faq) => {
    setSelectedFaq(faq || null);
    setViewOpen(true);
  };

  const handleEdit = (faq) => {
    setSelectedFaq(faq || null);
    setEditOpen(true);
  };

  return (
    <>
      {currentTab === "faq" ? (
        <div className="flex flex-col mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-xs font-medium text-[#0A0A0A]">
                FAQ Management
              </h2>
              <p className="text-[11px] text-[#717182]">
                Manage customer-facing FAQ entries.
              </p>
            </div>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-[#3979D2] bg-[#3979D2] px-4 py-1.5 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add FAQ</span>
            </button>
          </div>

          <div className={cx(wrapper(), "w-full")}>
            <table className={cx(table())}>
              <thead>
                <tr className={cx(headRow())}>
                  <th className={cx(headCell())}>Order</th>
                  <th className={cx(headCell())}>Question</th>
                  <th className={cx(headCell())}>Category</th>
                  <th className={cx(headCell())}>Visibility</th>
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
                      Loading FAQs...
                    </td>
                  </tr>
                ) : faqRows.length ? (
                  faqRows.map((row) => (
                    <tr key={row.id} className={cx(bodyRow())}>
                      <td className={cx(bodyCell())}>
                        <span className="text-xs text-[#6A7282]">
                          {typeof row.sort_order === "number"
                            ? row.sort_order
                            : "—"}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <span className="text-xs font-medium text-[#0A0A0A]">
                          {row.question || "Untitled question"}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <span className="text-xs text-[#6A7282]">
                          {row.category || "—"}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <Badge
                          variant={
                            visibilityVariant[
                              (row.visibility || "").toLowerCase()
                            ] || "neutral"
                          }
                          className="text-[11px] capitalize"
                        >
                          {row.visibility || "public"}
                        </Badge>
                      </td>
                      <td className={cx(bodyCell())}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(row)}
                            className="inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-2 py-1 text-[11px] text-[#3979D2] hover:border-[#3979D2] hover:bg-[#F3F8FF] cursor-pointer"
                          >
                            <Eye className="size-3 mr-1" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
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
                      colSpan={5}
                      className="px-4 py-8 text-center text-xs text-[#717182]"
                    >
                      No FAQs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <EditFaqDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        faq={selectedFaq}
      />
      <ViewFaqDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        faq={selectedFaq}
      />
    </>
  );
}

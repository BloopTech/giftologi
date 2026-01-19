"use client";
import React, { useState } from "react";
import { Plus, Eye, Pencil } from "lucide-react";
import { tv } from "tailwind-variants";
import { cx } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import EditStaticPageDialog from "../dialogs/EditStaticPageDialog";
import ViewStaticPageDialog from "../dialogs/ViewStaticPageDialog";

export default function StaticPagesTab(props) {
  const {
    currentTab,
    isLoading,
    staticPageRows,
    focusId,
    focusEntity,
    setFocusId,
    setFocusEntity,
    makeFocusDomId,
    staticPageStatusVariant,
    formatDate,
    wrapper,
    table,
    headRow,
    headCell,
    bodyRow,
    bodyCell,
  } = props;

  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);

  React.useEffect(() => {
    if (currentTab !== "static_pages") return;
    if (!focusId) return;
    if (String(focusEntity || "").toLowerCase() !== "content_static_page") return;
    if (viewOpen) return;

    const match = (staticPageRows || []).find((row) => row?.id === focusId);
    if (!match) return;

    setSelectedPage(match);
    setViewOpen(true);
    setFocusId?.("");
    setFocusEntity?.("");
  }, [currentTab, focusId, focusEntity, staticPageRows, viewOpen, setFocusId, setFocusEntity]);

  const handleNew = () => {
    setSelectedPage(null);
    setEditOpen(true);
  };

  const handleView = (page) => {
    setSelectedPage(page || null);
    setViewOpen(true);
  };

  const handleEdit = (page) => {
    setSelectedPage(page || null);
    setEditOpen(true);
  };

  return (
    <>
      {currentTab === "static_pages" ? (
        <div className="flex flex-col mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-xs font-medium text-[#0A0A0A]">
                Static Page Management
              </h2>
              <p className="text-[11px] text-[#717182]">
                Edit static pages from the site footer or help sections.
              </p>
            </div>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-[#3979D2] bg-[#3979D2] px-4 py-1.5 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
            >
              <Plus className="size-4" />
              <span>New Page</span>
            </button>
          </div>

          <div className={cx(wrapper(), "w-full")}>
            <table className={cx(table())}>
              <thead>
                <tr className={cx(headRow())}>
                  <th className={cx(headCell())}>Page Title</th>
                  <th className={cx(headCell())}>Slug</th>
                  <th className={cx(headCell())}>Status</th>
                  <th className={cx(headCell())}>Updated</th>
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
                      Loading static pages...
                    </td>
                  </tr>
                ) : staticPageRows.length ? (
                  staticPageRows.map((page) => (
                    <tr
                      key={page.id}
                      id={makeFocusDomId?.("content_static_page", page.id)}
                      className={
                        cx(bodyRow()) +
                        (focusId &&
                        String(focusEntity || "").toLowerCase() ===
                          "content_static_page" &&
                        page.id === focusId
                          ? " bg-[#F3F6FF]"
                          : "")
                      }
                    >
                      <td className={cx(bodyCell())}>
                        <span className="text-xs font-medium text-[#0A0A0A]">
                          {page.title || "Untitled page"}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <span className="text-xs text-[#6A7282]">
                          {page.slug ? `/${page.slug}` : "—"}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <Badge
                          variant={
                            staticPageStatusVariant[
                              (page.status || "").toLowerCase()
                            ] || "neutral"
                          }
                          className="text-[11px] capitalize"
                        >
                          {page.status || "draft"}
                        </Badge>
                      </td>
                      <td className={cx(bodyCell())}>
                        <span className="text-xs text-[#6A7282]">
                          {formatDate(page.updated_at || page.created_at)}
                        </span>
                      </td>
                      <td className={cx(bodyCell())}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(page)}
                            className="inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-2 py-1 text-[11px] text-[#3979D2] hover:border-[#3979D2] hover:bg-[#F3F8FF] cursor-pointer"
                          >
                            <Eye className="size-3 mr-1" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(page)}
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
                      No static pages found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <EditStaticPageDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        page={selectedPage}
      />
      <ViewStaticPageDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        page={selectedPage}
      />
    </>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { tv } from "tailwind-variants";
import { Badge } from "@/app/components/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/app/components/Dialog";
import { cx } from "@/app/components/utils";
import { ApproveCloseRequestDialog } from "./ApproveCloseRequestDialog";
import { RejectCloseRequestDialog } from "./RejectCloseRequestDialog";
import { useCloseRequestsContext } from "./context";
import { useDashboardContext } from "../context";

const tableStyles = tv({
  slots: {
    wrapper: "mt-4 overflow-x-auto border border-[#D6D6D6] rounded-xl bg-white",
    table: "min-w-full divide-y divide-gray-200",
    headRow: "bg-[#F9FAFB]",
    headCell:
      "px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide",
    bodyRow: "border-b last:border-b-0 hover:bg-gray-50/60",
    bodyCell: "px-4 py-3 text-xs text-[#0A0A0A] align-middle whitespace-nowrap",
  },
});

const { wrapper, table, headRow, headCell, bodyRow, bodyCell } = tableStyles();

const statusVariantMap = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  cancelled: "neutral",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

export default function CloseRequestsTable() {
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const {
    requests,
    requestsPage,
    pageSize,
    requestsTotal,
    loadingRequests,
    refreshRequests,
    setRequestsPage,
  } = useCloseRequestsContext() || {};

  const { currentAdmin } = useDashboardContext() || {};
  const allowedActionRoles = ["super_admin", "operations_manager_admin"];
  const canModerate =
    !!currentAdmin && allowedActionRoles.includes(currentAdmin.role);

  const rows = useMemo(() => {
    if (!requests || !requests.length) return [];
    return requests.map((row) => {
      const normalizedStatus = (row.status || "pending").toLowerCase();
      return {
        ...row,
        normalizedStatus,
        statusLabel:
          normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1),
      };
    });
  }, [requests]);

  const totalRows = requestsTotal ?? rows.length;
  const pageIndex = requestsPage ?? 0;
  const pageCount = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;
  const pageStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd =
    totalRows === 0 ? 0 : Math.min(totalRows, (pageIndex + 1) * pageSize);
  const canPrevious = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount;

  return (
    <div className={cx(wrapper())}>
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xs font-medium text-[#0A0A0A]">
            Pending Close Requests
          </h2>
          <p className="text-[11px] text-[#717182]">
            Review and approve vendor shop closures.
          </p>
        </div>
      </div>

      <table className={cx(table())}>
        <thead>
          <tr className={cx(headRow())}>
            <th className={cx(headCell())}>Vendor</th>
            <th className={cx(headCell())}>Requester</th>
            <th className={cx(headCell())}>Reason</th>
            <th className={cx(headCell())}>Requested</th>
            <th className={cx(headCell())}>Status</th>
            <th className={cx(headCell())}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loadingRequests ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                Loading close requests...
              </td>
            </tr>
          ) : rows.length ? (
            rows.map((row) => {
              const isPending = row.normalizedStatus === "pending";

              return (
                <tr key={row.id} className={cx(bodyRow())}>
                  <td className={cx(bodyCell())}>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[#0A0A0A]">
                        {row.vendorName}
                      </span>
                      <span className="text-[11px] text-[#6A7282]">
                        {row.vendorId?.slice(0, 8)}
                      </span>
                    </div>
                  </td>
                  <td className={cx(bodyCell())}>
                    <div className="flex flex-col">
                      <span className="text-xs text-[#0A0A0A]">
                        {row.requesterName}
                      </span>
                      <span className="text-[11px] text-[#6A7282]">
                        {row.requesterEmail}
                      </span>
                    </div>
                  </td>
                  <td className={cx(bodyCell())}>
                    <span className="text-xs text-[#6A7282] line-clamp-2">
                      {row.reason}
                    </span>
                  </td>
                  <td className={cx(bodyCell())}>{formatDate(row.createdAt)}</td>
                  <td className={cx(bodyCell())}>
                    <Badge variant={statusVariantMap[row.normalizedStatus] || "neutral"}>
                      {row.statusLabel}
                    </Badge>
                  </td>
                  <td className={cx(bodyCell())}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(row);
                          setViewOpen(true);
                        }}
                        className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100"
                        aria-label="View close request"
                      >
                        <Eye className="size-4" />
                      </button>

                      <ApproveCloseRequestDialog
                        request={row}
                        onCompleted={refreshRequests}
                        disabled={!canModerate || !isPending}
                      >
                        <button
                          type="button"
                          disabled={!canModerate || !isPending}
                          className={cx(
                            "rounded-full px-3 py-1 text-[11px] font-medium border",
                            "border-[#6EA30B] text-white bg-[#6EA30B] hover:bg-white hover:text-[#6EA30B]",
                            (!canModerate || !isPending) &&
                              "opacity-60 cursor-not-allowed hover:bg-[#6EA30B] hover:text-white",
                          )}
                        >
                          {isPending ? "Approve" : "Approved"}
                        </button>
                      </ApproveCloseRequestDialog>

                      <RejectCloseRequestDialog
                        request={row}
                        onCompleted={refreshRequests}
                        disabled={!canModerate || !isPending}
                      >
                        <button
                          type="button"
                          disabled={!canModerate || !isPending}
                          className={cx(
                            "rounded-full px-3 py-1 text-[11px] font-medium border",
                            "border-[#DF0404] text-[#DF0404] bg-white hover:bg-[#DF0404] hover:text-white",
                            (!canModerate || !isPending) &&
                              "opacity-60 cursor-not-allowed hover:bg-white hover:text-[#DF0404]",
                          )}
                        >
                          Reject
                        </button>
                      </RejectCloseRequestDialog>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                No close requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelectedRequest(null);
        }}
      >
        {selectedRequest && (
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Close Request Details</DialogTitle>
              <DialogDescription>
                Review request details before taking action.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-xs text-[#6A7282]">
              <div>
                <p className="font-medium text-[#0A0A0A]">Vendor</p>
                <p>{selectedRequest.vendorName}</p>
              </div>
              <div>
                <p className="font-medium text-[#0A0A0A]">Requester</p>
                <p>{selectedRequest.requesterName}</p>
                <p>{selectedRequest.requesterEmail}</p>
              </div>
              <div>
                <p className="font-medium text-[#0A0A0A]">Reason</p>
                <p>{selectedRequest.reason}</p>
                {selectedRequest.reasonType ? (
                  <p className="text-[11px] text-[#9CA3AF]">
                    Type: {selectedRequest.reasonType}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="font-medium text-[#0A0A0A]">Status</p>
                <p>{selectedRequest.statusLabel}</p>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="font-medium text-[#0A0A0A]">Requested</p>
                  <p>{formatDate(selectedRequest.createdAt)}</p>
                </div>
                <div>
                  <p className="font-medium text-[#0A0A0A]">Reviewed</p>
                  <p>{formatDate(selectedRequest.reviewedAt)}</p>
                </div>
              </div>
              {selectedRequest.adminNotes ? (
                <div>
                  <p className="font-medium text-[#0A0A0A]">Admin notes</p>
                  <p>{selectedRequest.adminNotes}</p>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end">
              <DialogClose asChild>
                <button className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50">
                  Close
                </button>
              </DialogClose>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {totalRows === 0
            ? "No requests to display"
            : `${pageStart} - ${pageEnd} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setRequestsPage?.((prev) => (prev > 0 ? prev - 1 : 0))
            }
            disabled={!canPrevious}
            className={cx(
              "flex h-7 w-7 items-center justify-center rounded-full border text-[#3979D2]",
              !canPrevious
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-[#3979D2] bg-white hover:bg-[#3979D2] hover:text-white",
            )}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs text-[#0A0A0A]">
            {pageIndex + 1} / {Math.max(pageCount, 1)}
          </span>
          <button
            type="button"
            onClick={() =>
              setRequestsPage?.((prev) => (canNext ? prev + 1 : prev))
            }
            disabled={!canNext}
            className={cx(
              "flex h-7 w-7 items-center justify-center rounded-full border text-[#3979D2]",
              !canNext
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-[#3979D2] bg-white hover:bg-[#3979D2] hover:text-white",
            )}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

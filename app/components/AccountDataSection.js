"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  Shield,
  X,
  Clock,
  CheckCircle2,
  Mail,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { createClient as createSupabaseClient } from "../utils/supabase/client";

function ConfirmationModal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function AccountDataSection() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [exporting, setExporting] = useState(false);
  const [exportRequest, setExportRequest] = useState(null); // pending/processing/ready
  const [downloading, setDownloading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const [userId, setUserId] = useState(null);

  // Fetch current user, check for pending deletion and active export requests
  useEffect(() => {
    let ignore = false;
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (ignore || !user) return;
      setUserId(user.id);

      // Check pending deletion
      const { data: deletionData } = await supabase
        .from("account_deletion_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (!ignore && deletionData) {
        setPendingDeletion(deletionData);
      }

      // Check active export request (pending, processing, or ready and not expired)
      const { data: exportData } = await supabase
        .from("data_export_requests")
        .select("id, status, download_token, requested_at, expires_at")
        .eq("user_id", user.id)
        .in("status", ["pending", "processing", "ready"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ignore && exportData) {
        // Check if ready export has expired client-side
        if (
          exportData.status === "ready" &&
          exportData.expires_at &&
          new Date(exportData.expires_at) < new Date()
        ) {
          setExportRequest(null);
        } else {
          setExportRequest(exportData);
        }
      }
    };
    check();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  // I2: Queue data export (async)
  const handleRequestExport = useCallback(async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("queue_data_export");

      if (error) throw error;

      if (data?.success) {
        setExportRequest({ id: data.request_id, status: "pending" });
        toast.success(data.message);
      } else {
        toast.error(data?.error || "Failed to queue export");
      }
    } catch (err) {
      console.error("Export request failed:", err);
      toast.error("Failed to request data export");
    } finally {
      setExporting(false);
    }
  }, [supabase]);

  // I2: Download ready export
  const handleDownloadExport = useCallback(async () => {
    if (!exportRequest?.download_token || !userId) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase
        .from("data_export_requests")
        .select("export_data")
        .eq("download_token", exportRequest.download_token)
        .eq("user_id", userId)
        .eq("status", "ready")
        .single();

      if (error) throw error;
      if (!data?.export_data) throw new Error("No export data found");

      // Trigger browser download
      const blob = new Blob([JSON.stringify(data.export_data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `giftologi-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Your data has been downloaded");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download data. The export may have expired.");
    } finally {
      setDownloading(false);
    }
  }, [exportRequest, userId, supabase]);

  // I3: Request account deletion
  const handleRequestDeletion = useCallback(async () => {
    if (deleteConfirmText !== "DELETE") return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const { data, error } = await supabase.rpc("request_account_deletion", {
        p_reason: deleteReason || null,
      });

      if (error) throw error;

      if (data?.success) {
        setPendingDeletion({
          scheduled_for: data.scheduled_for,
          status: "pending",
        });
        setDeleteModalOpen(false);
        setDeleteReason("");
        setDeleteConfirmText("");
        setDeleteError(null);
        toast.success(data.message);
      } else {
        // Show blocker error inside the modal
        setDeleteError(data?.error || "Failed to request deletion");
      }
    } catch (err) {
      console.error("Deletion request failed:", err);
      setDeleteError("Failed to request account deletion. Please try again.");
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirmText, deleteReason, supabase]);

  // I3: Cancel account deletion
  const handleCancelDeletion = useCallback(async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc("cancel_account_deletion");

      if (error) throw error;

      if (data?.success) {
        setPendingDeletion(null);
        toast.success(data.message);
      } else {
        toast.error(data?.error || "Failed to cancel deletion");
      }
    } catch (err) {
      console.error("Cancel deletion failed:", err);
      toast.error("Failed to cancel deletion request");
    } finally {
      setCancelling(false);
    }
  }, [supabase]);

  const scheduledDate = pendingDeletion?.scheduled_for
    ? new Date(pendingDeletion.scheduled_for).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const exportExpiresAt = exportRequest?.expires_at
    ? new Date(exportRequest.expires_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const isExportPendingOrProcessing =
    exportRequest?.status === "pending" ||
    exportRequest?.status === "processing";
  const isExportReady = exportRequest?.status === "ready";

  return (
    <>
      {/* Data & Privacy Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-5 mt-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="size-5 text-[#6B7280]" />
          <h2 className="text-[#111827] dark:text-white text-base font-semibold">
            Data & Privacy
          </h2>
        </div>
        <p className="text-[#6B7280] text-sm mb-5">
          Manage your personal data and account
        </p>

        {/* Export Data */}
        <div className="p-4 bg-[#F9FAFB] dark:bg-gray-800 rounded-xl mb-3">
          {isExportReady ? (
            /* Ready to download */
            <div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                  <FileDown className="size-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Your Data Export is Ready
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    Download your data as a JSON file. This link expires on{" "}
                    <span className="font-semibold">{exportExpiresAt}</span>.
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-3 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadExport}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      Download JSON
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : isExportPendingOrProcessing ? (
            /* Processing state */
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                <Loader2 className="size-5 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Preparing Your Data Export
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  Your data is being compiled. You will receive an email
                  notification with a download link when it is ready.
                </p>
              </div>
            </div>
          ) : (
            /* Default — request export */
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111827] dark:text-white">
                  Download My Data
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Request an export of all your personal data, orders,
                  registries, and activity. You will receive an email when it is
                  ready.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRequestExport}
                disabled={exporting}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#111827] dark:text-white border border-[#D1D5DB] dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {exporting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Mail className="size-4" />
                    Request Export
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Account Deletion */}
        <div
          className={`p-4 rounded-xl ${
            pendingDeletion
              ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
              : "bg-[#F9FAFB] dark:bg-gray-800"
          }`}
        >
          {pendingDeletion ? (
            /* Pending deletion state */
            <div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 shrink-0">
                  <Clock className="size-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Account Deletion Scheduled
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Your personal data will be removed on{" "}
                    <span className="font-semibold">{scheduledDate}</span>.
                    Financial records (orders, transactions, payouts) will be
                    preserved for bookkeeping as required by law. You can cancel
                    this request at any time before that date.
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={handleCancelDeletion}
                  disabled={cancelling}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Cancel Deletion — Keep My Account
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Normal state */
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111827] dark:text-white">
                  Delete Account
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Remove your personal data and close your account. Financial
                  records are preserved for legal and bookkeeping purposes.
                  30-day grace period applies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(true);
                  setDeleteError(null);
                }}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
              >
                <Trash2 className="size-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
            setDeleteConfirmText("");
            setDeleteReason("");
            setDeleteError(null);
          }
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-[#111827] dark:text-white">
                Delete Account
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!deleting) {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText("");
                  setDeleteReason("");
                  setDeleteError(null);
                }
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-2">
                This will permanently delete:
              </p>
              <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
                <li>- Your profile and personal information</li>
                <li>- All events and registries you created</li>
                <li>- Your browsing history and preferences</li>
                <li>- Notifications and saved items</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">
                Records preserved for bookkeeping:
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <li>
                  - Orders and transactions (anonymized — personal details
                  removed)
                </li>
                <li>- Payment and payout records</li>
                <li>- Refund and return records</li>
              </ul>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-2 italic">
                Required by financial regulations for audit and tax compliance.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>30-day grace period:</strong> You can cancel this request
                anytime within 30 days from your profile settings.
              </p>
            </div>

            {/* Blocker error from RPC */}
            {deleteError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-700 rounded-xl p-3">
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                  {deleteError}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-1">
                Reason for leaving (optional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Help us improve — why are you deleting your account?"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-1">
                Type <span className="font-bold text-red-600">DELETE</span> to
                confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText("");
                  setDeleteReason("");
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#374151] dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestDeletion}
                disabled={deleting || deleteConfirmText !== "DELETE"}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    Delete My Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </ConfirmationModal>
    </>
  );
}

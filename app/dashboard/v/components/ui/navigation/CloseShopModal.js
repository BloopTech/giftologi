"use client";
import React, { useState, useActionState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "../../../../../components/Dialog";
import { PiStorefront } from "react-icons/pi";
import { AlertTriangle, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { cx } from "../../../../../components/utils";
import { requestCloseShop, cancelCloseShopRequest } from "../../../action";

const STEPS = {
  INITIAL: "initial",
  CONFIRM: "confirm",
  REASON: "reason",
  SUCCESS: "success",
};

const CLOSE_REASONS = [
  { id: "business_closed", label: "Business is permanently closing" },
  { id: "moving_platform", label: "Moving to a different platform" },
  { id: "temporary_break", label: "Taking a temporary break" },
  { id: "financial_reasons", label: "Financial reasons" },
  { id: "personal_reasons", label: "Personal reasons" },
  { id: "other", label: "Other" },
];

export default function CloseShopModal({ vendorId, existingRequest }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(STEPS.INITIAL);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const [submitState, submitAction, isSubmitting] = useActionState(
    async (prevState, formData) => {
      const result = await requestCloseShop(formData);
      if (result.success) {
        setStep(STEPS.SUCCESS);
      }
      return result;
    },
    { success: false, error: null }
  );

  const [cancelState, cancelAction, isCancelling] = useActionState(
    async (prevState, formData) => {
      const result = await cancelCloseShopRequest(formData);
      if (result.success) {
        setOpen(false);
      }
      return result;
    },
    { success: false, error: null }
  );

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when closing
      setTimeout(() => {
        setStep(STEPS.INITIAL);
        setSelectedReason("");
        setOtherReason("");
        setConfirmText("");
      }, 200);
    }
  };

  const canProceedToConfirm = selectedReason && (selectedReason !== "other" || otherReason.trim());
  const canSubmit = confirmText.toLowerCase() === "close my shop";

  // If there's an existing pending request, show different UI
  if (existingRequest?.status === "pending") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <button className="text-amber-600 py-1 cursor-pointer hover:text-white hover:bg-amber-600 px-4 flex gap-8 w-full text-xs items-center">
            <Clock className="size-4" />
            <span>Close Request Pending</span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="size-5" />
              Close Shop Request Pending
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                Your request to close your shop is currently being reviewed by our team.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Submitted: {new Date(existingRequest.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Reason provided:</p>
              <p className="text-gray-500">{existingRequest.reason}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              <p>Our team typically reviews requests within 3-5 business days. You will receive an email notification once your request has been processed.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <form action={cancelAction}>
              <input type="hidden" name="request_id" value={existingRequest.id} />
              <input type="hidden" name="vendor_id" value={vendorId} />
              <button
                type="submit"
                disabled={isCancelling}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
              >
                {isCancelling && <Loader2 className="size-4 animate-spin" />}
                Cancel Request
              </button>
            </form>
            <DialogClose asChild>
              <button className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800">
                Close
              </button>
            </DialogClose>
          </DialogFooter>

          {cancelState.error && (
            <p className="text-xs text-red-500 mt-2">{cancelState.error}</p>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="text-[#D61711] py-1 cursor-pointer hover:text-white hover:bg-[#D61711] px-4 flex gap-8 w-full text-xs items-center">
          <PiStorefront className="size-4" />
          <span>Request to Close Shop</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        {/* Step 1: Initial Warning */}
        {step === STEPS.INITIAL && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#D61711]">
                <AlertTriangle className="size-5" />
                Close Your Shop
              </DialogTitle>
              <DialogDescription>
                Please read carefully before proceeding
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">What happens when you close your shop:</h4>
                <ul className="text-sm text-red-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <XCircle className="size-4 mt-0.5 shrink-0" />
                    <span>Your shop will no longer be visible to customers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="size-4 mt-0.5 shrink-0" />
                    <span>All active product listings will be deactivated</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="size-4 mt-0.5 shrink-0" />
                    <span>Pending orders must be fulfilled before closure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="size-4 mt-0.5 shrink-0" />
                    <span>Outstanding payouts will be processed as scheduled</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This action requires admin approval. Your shop will remain active until the request is approved.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={() => setStep(STEPS.REASON)}
                className="px-4 py-2 text-sm bg-[#D61711] text-white rounded-md hover:bg-red-700"
              >
                I Understand, Continue
              </button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Select Reason */}
        {step === STEPS.REASON && (
          <>
            <DialogHeader>
              <DialogTitle>Why are you closing your shop?</DialogTitle>
              <DialogDescription>
                Help us understand your reason for leaving
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              {CLOSE_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className={cx(
                    "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedReason === reason.id
                      ? "border-[#D61711] bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="close_reason"
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="accent-[#D61711]"
                  />
                  <span className="text-sm">{reason.label}</span>
                </label>
              ))}

              {selectedReason === "other" && (
                <textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Please describe your reason..."
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D61711]/20 focus:border-[#D61711]"
                  rows={3}
                />
              )}
            </div>

            <DialogFooter className="gap-2">
              <button
                onClick={() => setStep(STEPS.INITIAL)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep(STEPS.CONFIRM)}
                disabled={!canProceedToConfirm}
                className="px-4 py-2 text-sm bg-[#D61711] text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Final Confirmation */}
        {step === STEPS.CONFIRM && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#D61711]">Final Confirmation</DialogTitle>
              <DialogDescription>
                Type "close my shop" to confirm your request
              </DialogDescription>
            </DialogHeader>

            <form action={submitAction} className="py-4 space-y-4">
              <input type="hidden" name="vendor_id" value={vendorId} />
              <input
                type="hidden"
                name="reason"
                value={selectedReason === "other" ? otherReason : CLOSE_REASONS.find(r => r.id === selectedReason)?.label}
              />
              <input type="hidden" name="reason_type" value={selectedReason} />

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Reason for closing:</p>
                <p className="text-sm font-medium">
                  {selectedReason === "other"
                    ? otherReason
                    : CLOSE_REASONS.find((r) => r.id === selectedReason)?.label}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono bg-gray-100 px-1 rounded">close my shop</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="close my shop"
                  className={cx(
                    "w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2",
                    canSubmit
                      ? "border-green-500 focus:ring-green-500/20 focus:border-green-500"
                      : "border-gray-200 focus:ring-[#D61711]/20 focus:border-[#D61711]"
                  )}
                />
              </div>

              {submitState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{submitState.error}</p>
                </div>
              )}

              <DialogFooter className="gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(STEPS.REASON)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="px-4 py-2 text-sm bg-[#D61711] text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Submit Request
                </button>
              </DialogFooter>
            </form>
          </>
        )}

        {/* Step 4: Success */}
        {step === STEPS.SUCCESS && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="size-5" />
                Request Submitted
              </DialogTitle>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle2 className="size-12 text-green-500 mx-auto mb-3" />
                <h4 className="font-medium text-green-800 mb-2">
                  Your close shop request has been submitted
                </h4>
                <p className="text-sm text-green-700">
                  Our team will review your request and get back to you within 3-5 business days.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <h5 className="font-medium mb-2">What happens next?</h5>
                <ul className="space-y-1 text-gray-500">
                  <li>• Your shop remains active during the review period</li>
                  <li>• You&apos;ll receive an email confirmation shortly</li>
                  <li>• An admin will review and process your request</li>
                  <li>• You can cancel this request anytime before approval</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <button className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 w-full">
                  Done
                </button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

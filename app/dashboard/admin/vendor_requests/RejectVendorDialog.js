"use client";
import React, { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { rejectVendorApplication } from "../action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/Dialog";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { AlertCircle } from "lucide-react";

const initialState = {
  message: "",
  errors: {},
  values: {},
  data: {},
};

function SubmitButton({ disabled }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-full px-5 py-2 text-xs font-medium cursor-pointer border border-[#DF0404] text-white bg-[#DF0404] hover:bg-white hover:text-[#DF0404]"
    >
      {pending ? "Rejecting..." : "Reject Application"}
    </button>
  );
}

export function RejectVendorDialog({ applicationId, businessName, children }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    rejectVendorApplication,
    initialState,
  );

  // Close dialog on successful rejection
  if (state.message && !state.errors?.reason && state.data?.applicationId) {
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#DF0404]">Reject Vendor Application</DialogTitle>
          <DialogDescription>
            Are you sure you want to reject the vendor application for{" "}
            <span className="font-semibold">{businessName}</span>? 
            This action cannot be undone and a reason must be provided.
          </DialogDescription>
        </DialogHeader>
        
        <form action={formAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="reason" className="text-sm font-medium text-[#0A0A0A]">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                placeholder="Please provide a detailed reason for rejecting this vendor application..."
                className={cx(
                  "min-h-[100px] resize-none w-full rounded-lg border border-gray-300 px-3 py-2 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-[#DF0404] focus:border-transparent",
                  state.errors?.reason && hasErrorInput()
                )}
                required
              />
              {state.errors?.reason && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>{state.errors.reason[0]}</span>
                </div>
              )}
            </div>
            
            {state.message && state.errors?.reason && (
              <div className="rounded-md bg-red-50 p-3">
                <div className="flex items-center gap-2 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span>{state.message}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
              onClick={() => setOpen(false)}
              disabled={state.message && !state.errors?.reason}
            >
              Cancel
            </button>
            <SubmitButton disabled={state.message && !state.errors?.reason} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

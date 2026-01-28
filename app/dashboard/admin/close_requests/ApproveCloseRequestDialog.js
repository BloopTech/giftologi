"use client";

import React, { useEffect, useState, useActionState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/Dialog";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { approveCloseRequest } from "./action";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

const initialState = {
  message: "",
  errors: {},
  values: {},
  data: {},
};

export function ApproveCloseRequestDialog({ request, onCompleted, children, disabled }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    approveCloseRequest,
    initialState,
  );

  useEffect(() => {
    if (!state) return;

    if (state.data?.requestId) {
      toast.success(state.message || "Close request approved.");
      onCompleted?.();
      setOpen(false);
    } else if (state.message && state.errors && Object.keys(state.errors).length) {
      toast.error(state.message);
    }
  }, [state, onCompleted]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span>{children}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[#D61711] flex items-center gap-2">
            <AlertTriangle className="size-5" /> Approve Close Request
          </DialogTitle>
          <DialogDescription>
            This will close <strong>{request?.vendorName}</strong> and deactivate all
            products. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="requestId" value={request?.id || ""} />

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Type <span className="font-semibold">close shop</span> to confirm.
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#0A0A0A]">
              Confirmation text
            </label>
            <input
              type="text"
              name="confirmText"
              placeholder="close shop"
              className={cx(
                "w-full rounded-md border border-gray-300 px-3 py-2 text-xs",
                focusInput,
                state.errors?.confirmText?.length ? hasErrorInput : "",
              )}
              disabled={isPending || disabled}
            />
            {state.errors?.confirmText?.length ? (
              <p className="text-xs text-red-500">{state.errors.confirmText[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#0A0A0A]">
              Admin notes (optional)
            </label>
            <textarea
              name="adminNotes"
              rows={3}
              placeholder="Any additional context for this approval"
              className={cx(
                "w-full rounded-md border border-gray-300 px-3 py-2 text-xs",
                focusInput,
              )}
              disabled={isPending || disabled}
            />
          </div>

          {state.message && state.errors && Object.keys(state.errors).length ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {state.message}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || disabled}
              className="rounded-full border border-[#D61711] bg-[#D61711] px-5 py-2 text-xs font-medium text-white hover:bg-white hover:text-[#D61711]"
            >
              {isPending ? "Approving..." : "Approve & Close"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { rejectCloseRequest } from "./action";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

const initialState = {
  message: "",
  errors: {},
  values: {},
  data: {},
};

export function RejectCloseRequestDialog({ request, onCompleted, children, disabled }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    rejectCloseRequest,
    initialState,
  );

  useEffect(() => {
    if (!state) return;

    if (state.data?.requestId) {
      toast.success(state.message || "Close request rejected.");
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
          <DialogTitle className="text-[#DF0404] flex items-center gap-2">
            <AlertCircle className="size-5" /> Reject Close Request
          </DialogTitle>
          <DialogDescription>
            Let the vendor know why their close request was rejected.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="requestId" value={request?.id || ""} />

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#0A0A0A]">
              Rejection reason
            </label>
            <textarea
              name="reason"
              rows={4}
              placeholder="Explain why this request is being rejected"
              className={cx(
                "w-full rounded-md border border-gray-300 px-3 py-2 text-xs",
                focusInput,
                state.errors?.reason?.length ? hasErrorInput : "",
              )}
              disabled={isPending || disabled}
            />
            {state.errors?.reason?.length ? (
              <p className="text-xs text-red-500">{state.errors.reason[0]}</p>
            ) : null}
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
              className="rounded-full border border-[#DF0404] bg-[#DF0404] px-5 py-2 text-xs font-medium text-white hover:bg-white hover:text-[#DF0404]"
            >
              {isPending ? "Rejecting..." : "Reject"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

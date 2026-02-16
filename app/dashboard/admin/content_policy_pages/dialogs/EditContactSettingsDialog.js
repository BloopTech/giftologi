"use client";

import React, { useActionState, useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { X, Loader2 } from "lucide-react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { saveContactSettings } from "../action";
import { useContentsPolicyContext } from "../context";
import { toast } from "sonner";

const initialState = {
  message: "",
  errors: {
    supportEmail: [],
    supportPhone: [],
    officeAddress: [],
    businessHours: [],
    whatsappLink: [],
  },
  values: {},
  data: {},
};

const errorFor = (state, key) => state?.errors?.[key] ?? [];
const hasError = (state, key) => (errorFor(state, key)?.length ?? 0) > 0;

export default function EditContactSettingsDialog({ open, onOpenChange }) {
  const [state, formAction, pending] = useActionState(
    saveContactSettings,
    initialState,
  );
  const { refresh, contactSettings } = useContentsPolicyContext() || {};

  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");

  useEffect(() => {
    if (!open) return;
    const values = state?.values || {};
    setSupportEmail(
      values.supportEmail ?? contactSettings?.support_email ?? "",
    );
    setSupportPhone(
      values.supportPhone ?? contactSettings?.support_phone ?? "",
    );
    setOfficeAddress(
      values.officeAddress ?? contactSettings?.office_address ?? "",
    );
    setBusinessHours(
      values.businessHours ?? contactSettings?.business_hours ?? "",
    );
    setWhatsappLink(
      values.whatsappLink ?? contactSettings?.whatsapp_link ?? "",
    );
  }, [open, contactSettings, state?.values]);

  useEffect(() => {
    if (!state?.message) return;

    const hasErrors =
      state?.errors &&
      Object.keys(state.errors).some((key) => (state.errors[key] || []).length);
    const hasData = state?.data && Object.keys(state.data).length > 0;

    if (hasErrors) {
      toast.error(state.message);
      return;
    }

    if (hasData) {
      toast.success(state.message);
      refresh?.();
      onOpenChange?.(false);
    }
  }, [state, refresh, onOpenChange]);

  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    onOpenChange(!!next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              Edit Contact Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Update customer support contact information.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97373] text-white hover:bg-[#EF4444] cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <form action={formAction} className="mt-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-[#0A0A0A]"
                htmlFor="support-email"
              >
                Support Email
              </label>
              <input
                id="support-email"
                name="supportEmail"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@giftologi.com"
                className={cx(
                  "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError(state, "supportEmail") ? hasErrorInput : "",
                )}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-[#0A0A0A]"
                htmlFor="support-phone"
              >
                Support Phone
              </label>
              <input
                id="support-phone"
                name="supportPhone"
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="(+233) 000 000 000"
                className={cx(
                  "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError(state, "supportPhone") ? hasErrorInput : "",
                )}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-[#0A0A0A]"
              htmlFor="office-address"
            >
              Office Address
            </label>
            <textarea
              id="office-address"
              name="officeAddress"
              rows={3}
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
              placeholder="123 Example Street, Accra"
              className={cx(
                "w-full rounded-2xl border px-4 py-3 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError(state, "officeAddress") ? hasErrorInput : "",
              )}
              disabled={pending}
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-[#0A0A0A]"
              htmlFor="business-hours"
            >
              Business Hours
            </label>
            <textarea
              id="business-hours"
              name="businessHours"
              rows={2}
              value={businessHours}
              onChange={(e) => setBusinessHours(e.target.value)}
              placeholder="Mon - Fri, 9:00am - 5:00pm"
              className={cx(
                "w-full rounded-2xl border px-4 py-3 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError(state, "businessHours") ? hasErrorInput : "",
              )}
              disabled={pending}
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-[#0A0A0A]"
              htmlFor="whatsapp-link"
            >
              WhatsApp Link
            </label>
            <input
              id="whatsapp-link"
              name="whatsappLink"
              type="text"
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
              placeholder="https://wa.me/"
              className={cx(
                "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError(state, "whatsappLink") ? hasErrorInput : "",
              )}
              disabled={pending}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending}
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

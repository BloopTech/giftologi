"use client";
import React, { useActionState, useEffect, useState } from "react";
import { createRegistryAction } from "../action";
import { toast } from "sonner";
import { DatePicker } from "../../../components/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";
import { cx, focusInput, hasErrorInput } from "../../../components/utils";
import { DialogClose } from "../../../components/Dialog";

const initialState = {
  message: "",
  errors: {
    title: [],
    type: [],
    location: [],
    description: [],
    date: [],
    deadline: [],
    privacy: [],
    credentials: {},
    unknown: "",
  },
  values: {},
  data: {},
};

export default function CreateRegistryDialog({ onClose }) {
  const [state, formAction, isPending] = useActionState(
    createRegistryAction,
    initialState
  );

  const [typeValue, setTypeValue] = useState(state?.values?.type ?? "");
  const [privacyValue, setPrivacyValue] = useState(state?.values?.privacy ?? "");
  const [eventDate, setEventDate] = useState(
    state?.values?.date ? new Date(state.values.date) : undefined
  );
  const [deadlineDate, setDeadlineDate] = useState(
    state?.values?.deadline ? new Date(state.values.deadline) : undefined
  );

  useEffect(() => {
    setTypeValue(state?.values?.type ?? "");
    setPrivacyValue(state?.values?.privacy ?? "");
    setEventDate(state?.values?.date ? new Date(state.values.date) : undefined);
    setDeadlineDate(
      state?.values?.deadline ? new Date(state.values.deadline) : undefined
    );
  }, [state?.values]);

  useEffect(() => {
    if (state?.message && state?.errors && Object.keys(state.errors).length) {
      toast.error(state.message);
    }
    if (state?.message && state?.data && Object.keys(state.data).length) {
      toast.success(state.message);
      // Close dialog on success if handler provided
      onClose?.();
    }
  }, [state?.message, state?.errors, state?.data, onClose]);

  const errorFor = (key) => state?.errors?.[key] ?? [];
  const hasError = (key) => (errorFor(key)?.length ?? 0) > 0;

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={state?.values?.title ?? ""}
            placeholder="e.g. Sarah & John Wedding"
            className={cx(
              "w-full rounded-md border px-3 py-2 shadow-sm outline-none transition sm:text-sm",
              "bg-white dark:bg-gray-950",
              "border-gray-300 dark:border-gray-800",
              "text-gray-900 dark:text-gray-50",
              "placeholder-gray-400 dark:placeholder-gray-500",
              "hover:bg-gray-50 hover:dark:bg-gray-950/50",
              focusInput,
              hasError("title") ? hasErrorInput : ""
            )}
            disabled={isPending}
          />
          {hasError("title") && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {errorFor("title").map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="type" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Type
          </label>
          <input type="hidden" name="type" value={typeValue} />
          <Select value={typeValue} onValueChange={setTypeValue} disabled={isPending}>
            <SelectTrigger className={cx(hasError("type") ? hasErrorInput : "")}>
              <SelectValue placeholder="Select registry type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Wedding">Wedding</SelectItem>
              <SelectItem value="Birthday">Birthday</SelectItem>
              <SelectItem value="Baby Shower">Baby Shower</SelectItem>
              <SelectItem value="Fundraiser">Fundraiser</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {hasError("type") && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {errorFor("type").map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            required
            defaultValue={state?.values?.location ?? ""}
            placeholder="e.g. Austin, TX"
            className={cx(
              "w-full rounded-md border px-3 py-2 shadow-sm outline-none transition sm:text-sm",
              "bg-white dark:bg-gray-950",
              "border-gray-300 dark:border-gray-800",
              "text-gray-900 dark:text-gray-50",
              "placeholder-gray-400 dark:placeholder-gray-500",
              "hover:bg-gray-50 hover:dark:bg-gray-950/50",
              focusInput,
              hasError("location") ? hasErrorInput : ""
            )}
            disabled={isPending}
          />
          {hasError("location") && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {errorFor("location").map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={state?.values?.description ?? ""}
            placeholder="Share details about your event..."
            className={cx(
              "w-full rounded-md border px-3 py-2 shadow-sm outline-none transition sm:text-sm",
              "bg-white dark:bg-gray-950",
              "border-gray-300 dark:border-gray-800",
              "text-gray-900 dark:text-gray-50",
              "placeholder-gray-400 dark:placeholder-gray-500",
              "hover:bg-gray-50 hover:dark:bg-gray-950/50",
              focusInput,
              hasError("description") ? hasErrorInput : ""
            )}
            disabled={isPending}
          />
          {hasError("description") && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {errorFor("description").map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Event Date
          </label>
          <input type="hidden" name="date" value={eventDate ? eventDate.toISOString() : ""} />
          <DatePicker
            value={eventDate}
            onChange={setEventDate}
            placeholder="Select event date"
            hasError={hasError("date")}
          />
          {hasError("date") && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {errorFor("date").map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Deadline
          </label>
          <input
            type="hidden"
            name="deadline"
            value={deadlineDate ? deadlineDate.toISOString() : ""}
          />
          <DatePicker
            value={deadlineDate}
            onChange={setDeadlineDate}
            placeholder="Select deadline"
            hasError={hasError("deadline")}
          />
          {hasError("deadline") && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {errorFor("deadline").map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="privacy" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Privacy
          </label>
          <input type="hidden" name="privacy" value={privacyValue} />
          <Select value={privacyValue} onValueChange={setPrivacyValue} disabled={isPending}>
            <SelectTrigger className={cx(hasError("privacy") ? hasErrorInput : "")}>
              <SelectValue placeholder="Select privacy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="invite-only">Invite-only</SelectItem>
            </SelectContent>
          </Select>
          {hasError("privacy") && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {errorFor("privacy").map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <DialogClose asChild>
          <button
            type="button"
            className="rounded-md border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900/60 cursor-pointer"
            disabled={isPending}
          >
            Cancel
          </button>
        </DialogClose>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md border border-[#A5914B] bg-[#A5914B] px-5 py-2 text-sm font-medium text-white hover:bg-white hover:text-[#A5914B] cursor-pointer"
        >
          {isPending ? "Creating..." : "Create Registry"}
        </button>
      </div>
    </form>
  );
}

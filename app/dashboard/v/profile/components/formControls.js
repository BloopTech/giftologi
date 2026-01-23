"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PiLockKey, PiCheckCircle, PiEye, PiEyeClosed } from "react-icons/pi";

export function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-[#374151]" />
      <h2 className="text-[#111827] text-base font-semibold font-inter">{title}</h2>
    </div>
  );
}

export function FormField({
  label,
  value,
  icon: Icon,
  required,
  className = '',
  name,
  type = 'text',
  readOnly = false,
}) {
  const inputClasses = `w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
    readOnly ? 'bg-[#F9FAFB] text-[#9CA3AF] cursor-not-allowed' : 'bg-white text-[#111827]'
  }`;
  const inputValue = value ?? '';
  const inputProps = readOnly
    ? {
        value: inputValue,
      }
    : {
        defaultValue: inputValue,
      };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[#374151] text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        )}
        <input
          type={type}
          name={name}
          readOnly={readOnly}
          aria-readonly={readOnly}
          tabIndex={readOnly ? -1 : 0}
          className={inputClasses}
          {...inputProps}
        />
      </div>
    </div>
  );
}

const maskSensitiveValue = (rawValue = "") => {
  if (!rawValue) return "—";
  const stringValue = String(rawValue);
  if (stringValue.length <= 4) {
    return "•".repeat(stringValue.length);
  }
  const visibleSegment = stringValue.slice(-4);
  return `${"•".repeat(stringValue.length - 4)}${visibleSegment}`;
};

export function LockedField({ label, value, icon: Icon, name, mask = false }) {
  const [revealed, setRevealed] = useState(false);
  const displayValue = value || "";
  const maskedValue = mask ? maskSensitiveValue(displayValue) : displayValue || "—";
  const shouldShowToggle = mask && Boolean(displayValue);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[#374151] text-sm font-medium flex items-center gap-2">
        {label}
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-[10px] px-2 py-0.5">
          <PiLockKey className="w-3 h-3" /> Locked
        </span>
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-3 py-2.5 text-sm text-[#92400E]">
        {Icon && <Icon className="w-4 h-4 text-[#F59E0B]" />}
        <span className="truncate flex-1">
          {revealed || !mask ? displayValue || '—' : maskedValue}
        </span>
        {shouldShowToggle && (
          <button
            type="button"
            aria-label={revealed ? "Hide value" : "Show value"}
            aria-pressed={revealed}
            onClick={() => setRevealed((prev) => !prev)}
            className="cursor-pointer text-[#B45309] hover:text-[#92400E] focus:outline-none"
          >
            {revealed ? (
              <PiEyeClosed className="w-4 h-4" />
            ) : (
              <PiEye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      <input type="hidden" name={name} value={displayValue} />
    </div>
  );
}

export function TextAreaField({ label, value, placeholder, name }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[#374151] text-sm font-medium">{label}</label>
      <textarea
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2.5 border border-[#D1D5DB] rounded-lg text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white resize-none"
      />
    </div>
  );
}

export function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!enabled)}
      className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-[#111827]' : 'bg-[#D1D5DB]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function NotificationRow({ title, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-b-0">
      <div>
        <p className="text-[#111827] text-sm font-medium">{title}</p>
        <p className="text-[#6B7280] text-xs">{description}</p>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} />
    </div>
  );
}

export function DocumentRow({ document }) {
  const title = document?.title || document?.name || document?.label || 'Document';
  const url = document?.url;
  const verifiedDate = document?.verifiedDate || document?.created_at || null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#D1FAE5] rounded-full">
          <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
        </div>
        <div>
          <p className="text-[#111827] text-sm font-medium">{title}</p>
          <p className="text-[#6B7280] text-xs">
            {verifiedDate ? `Verified on ${formatMemberSince(verifiedDate)}` : 'Uploaded'}
          </p>
        </div>
      </div>
      {url ? (
        <Link
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-[#6B7280] text-sm font-medium hover:text-[#111827] transition-colors"
        >
          View
        </Link>
      ) : (
        <span className="text-[#9CA3AF] text-sm">Pending</span>
      )}
    </div>
  );
}

function formatMemberSince(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

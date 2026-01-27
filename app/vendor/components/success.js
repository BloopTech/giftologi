"use client";
import React, { useState } from "react";
import { Mail, Clock, CheckCircle, Copy, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/giftologi-logo.png";

// Success Screen Component
export function SuccessScreen({ applicationId, email, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(applicationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 text-center">
      <div className="flex items-center justify-center mx-auto mb-6">
        <Image src={logo} alt="logo" width={60} height={60} priority />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Application Submitted Successfully!
      </h2>
      <p className="text-sm text-gray-500 mb-8">
        Thank you for applying to become a vendor on our platform.
      </p>

      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <p className="text-xs text-gray-500 mb-2">Your Application ID</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg font-semibold text-gray-900 font-mono">
            {applicationId}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        {copied && (
          <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Please save your application ID
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          What Happens Next?
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg text-left">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Confirmation Email
              </p>
              <p className="text-xs text-gray-500">
                We&apos;ve sent a confirmation email to {email || "Hello"} with
                your application details.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg text-left">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Review Process
              </p>
              <p className="text-xs text-gray-500">
                Our team will review your application within 2-3 business days.
                You&apos;ll receive an email with the status update.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-lg text-left">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Approval & Onboarding
              </p>
              <p className="text-xs text-gray-500">
                Once approved, you&apos;ll get access to your vendor dashboard
                and can start adding products immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Have questions about your application?
      </p>

      <div className="flex items-center justify-center gap-3 mb-6">
        <Link
          href="/contact"
          className="px-4 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Contact Support
        </Link>
        <Link
          href="/faq"
          className="px-4 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View FAQs
        </Link>
      </div>

      <Link
        href="/dashboard/v/profile"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#3B82F6] text-white rounded-full text-sm font-medium hover:bg-[#2563EB] transition-colors"
      >
        View Vendor Profile
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

"use client";
import React from "react";
import { Info } from "lucide-react";

// Step 4: Banking
export function BankingStep({ formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900">
          Step 4 of 5: Banking
        </h3>
      </div>

      <div className="space-y-5">
        <p className="text-sm text-gray-500">
          Where should we send your payouts?
        </p>

        <div className="bg-[#E8F5E9] border border-[#C8E6C9] rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#22C55E] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#22C55E]">
              Secure Information
            </p>
            <p className="text-xs text-[#22C55E]">
              Your banking information is encrypted and stored securely.
              We&apos;ll use this to send your bi-monthly payouts.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Holder Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="accountHolderName"
            value={formData.accountHolderName || ""}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName || ""}
            onChange={handleChange}
            placeholder="e.g., CAL Bank"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber || ""}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Routing Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="routingNumber"
              value={formData.routingNumber || ""}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Type
          </label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="accountType"
                value="checking"
                checked={formData.accountType === "checking"}
                onChange={handleChange}
                className="w-4 h-4 border-gray-300 text-[#BBA96C] focus:ring-[#BBA96C]"
              />
              <span className="text-sm text-gray-700">Checking</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="accountType"
                value="savings"
                checked={formData.accountType === "savings"}
                onChange={handleChange}
                className="w-4 h-4 border-gray-300 text-[#BBA96C] focus:ring-[#BBA96C]"
              />
              <span className="text-sm text-gray-700">Savings</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

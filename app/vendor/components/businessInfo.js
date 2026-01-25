"use client";
import React from "react";





// Step 2: Business Info
export function BusinessInfoStep({ formData, setFormData, disabled }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900">
          Step 2 of 5: Business Info
        </h3>
      </div>

      <div className="space-y-5">
        <p className="text-sm text-gray-500">Tell us about your business</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="businessName"
            value={formData.businessName || ""}
            onChange={handleChange}
            disabled={disabled}
            placeholder="e.g., Premium Home Goods"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C] disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Legal Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="legalBusinessName"
            value={formData.legalBusinessName || ""}
            onChange={handleChange}
            disabled={disabled}
            placeholder="e.g., Premium Home Goods LLC"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C] disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Type
            </label>
            <input
              type="text"
              name="businessType"
              value={formData.businessType || ""}
              onChange={handleChange}
              disabled={disabled}
              placeholder="e.g., LLC, Corporation, Sole Proprietor"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C] disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax ID / EIN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="taxId"
              value={formData.taxId || ""}
              onChange={handleChange}
              disabled={disabled}
              placeholder="XX-XXXXXXX"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C] disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year Established
            </label>
            <input
              type="text"
              name="yearEstablished"
              value={formData.yearEstablished || ""}
              onChange={handleChange}
              disabled={disabled}
              placeholder="YYYY"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C] disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="text"
              name="website"
              value={formData.website || ""}
              onChange={handleChange}
              disabled={disabled}
              placeholder="www.yourbusiness.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C] disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Description
          </label>
          <textarea
            name="businessDescription"
            value={formData.businessDescription || ""}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Tell us about your business, what you sell, and what makes you unique..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C] resize-none disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
      </div>
    </div>
  );
}

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
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
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
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="businessType"
              value={formData.businessType || ""}
              onChange={handleChange}
              disabled={disabled}
              placeholder="e.g., LLC, Corporation, Sole Proprietor"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="businessRegistrationNumber"
              value={formData.businessRegistrationNumber || ""}
              onChange={handleChange}
              disabled={disabled}
              placeholder="BR-2024-001"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Years in Business
          </label>
          <input
            type="number"
            name="yearsInBusiness"
            min="0"
            value={formData.yearsInBusiness || ""}
            onChange={handleChange}
            disabled={disabled}
            placeholder="e.g., 5"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="website"
            value={formData.website || ""}
            onChange={handleChange}
            disabled={disabled}
            placeholder="https://www.yourbusiness.com"
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
          />
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
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700">
              Business References
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference 1 Name
                </label>
                <input
                  type="text"
                  name="ref1Name"
                  value={formData.ref1Name || ""}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference 1 Company
                </label>
                <input
                  type="text"
                  name="ref1Company"
                  value={formData.ref1Company || ""}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference 1 Phone
                </label>
                <input
                  type="text"
                  name="ref1Phone"
                  value={formData.ref1Phone || ""}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference 1 Email
                </label>
                <input
                  type="email"
                  name="ref1Email"
                  value={formData.ref1Email || ""}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference 2 Name
                </label>
                <input
                  type="text"
                  name="ref2Name"
                  value={formData.ref2Name || ""}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference 2 Company
                </label>
                <input
                  type="text"
                  name="ref2Company"
                  value={formData.ref2Company || ""}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference 2 Phone
                </label>
                <input
                  type="text"
                  name="ref2Phone"
                  value={formData.ref2Phone || ""}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference 2 Email
                </label>
                <input
                  type="email"
                  name="ref2Email"
                  value={formData.ref2Email || ""}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

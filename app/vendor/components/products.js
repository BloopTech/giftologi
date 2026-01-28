"use client";
import React from "react";



// Step 3: Products
export function ProductsStep({
  formData,
  setFormData,
  disabled,
  categories = [],
  categoriesLoading = false,
  categoriesError = null,
}) {
  const productCategories = Array.isArray(categories)
    ? categories
        .map((category) =>
          typeof category === "string" ? category : category?.name,
        )
        .filter(Boolean)
    : [];

  const shippingMethods = [
    "Standard Shipping",
    "Express Shipping",
    "International Shipping",
    "Local Pickup",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (category) => {
    const currentCategories = formData.productCategories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];
    setFormData((prev) => ({ ...prev, productCategories: newCategories }));
  };

  const handleShippingChange = (method) => {
    const currentMethods = formData.shippingMethods || [];
    const newMethods = currentMethods.includes(method)
      ? currentMethods.filter((m) => m !== method)
      : [...currentMethods, method];
    setFormData((prev) => ({ ...prev, shippingMethods: newMethods }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900">
          Step 3 of 5: Products
        </h3>
      </div>

      <div className="space-y-5">
        <p className="text-sm text-gray-500">What will you be selling?</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Vendor Categories <span className="text-red-500">*</span>{" "}
            <span className="font-normal text-gray-500">
              (Select all that apply)
            </span>
          </label>
          {categoriesLoading ? (
            <p className="text-sm text-gray-500">Loading categories...</p>
          ) : categoriesError ? (
            <p className="text-sm text-red-600">Unable to load categories.</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {productCategories.length ? (
              productCategories.map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(formData.productCategories || []).includes(
                      category,
                    )}
                    onChange={() => handleCategoryChange(category)}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">{category}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No categories available yet.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Number of Products
            </label>
            <input
              type="text"
              name="estimatedProducts"
              value={formData.estimatedProducts || ""}
              onChange={handleChange}
              placeholder="e.g., 50"
              disabled={disabled}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Average Product Price
            </label>
            <input
              type="text"
              name="averagePrice"
              value={formData.averagePrice || ""}
              onChange={handleChange}
              placeholder="$0.00"
              disabled={disabled}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ships From (City, State)
          </label>
          <input
            type="text"
            name="shipsFrom"
            value={formData.shipsFrom || ""}
            onChange={handleChange}
            placeholder="e.g., Tema, Greater Accra"
            disabled={disabled}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Shipping Methods{" "}
            <span className="font-normal text-gray-500">
              (Select all that apply)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {shippingMethods.map((method) => (
              <label
                key={method}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(formData.shippingMethods || []).includes(method)}
                  onChange={() => handleShippingChange(method)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">{method}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Description
          </label>
          <textarea
            name="productDescription"
            value={formData.productDescription || ""}
            onChange={handleChange}
            placeholder="Describe the types of products you'll be selling..."
            rows={3}
            disabled={disabled}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
      </div>
    </div>
  );
}

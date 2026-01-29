"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../../../components/Dialog";
import { X, Check } from "lucide-react";

export default function GifterInfoModal({
  open,
  onOpenChange,
  product,
  hostName,
  onSubmit,
  onSkip,
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    stayAnonymous: false,
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit?.(formData);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg rounded-2xl shadow-xl p-0">
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer z-10">
          <X className="h-5 w-5 text-gray-500" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="flex flex-col md:flex-row">
          {/* Product Preview */}
          {product && (
            <div className="hidden md:flex w-1/3 bg-gray-50 rounded-l-2xl p-4 items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-4 border-[#A5914B] flex items-center justify-center bg-white mb-2">
                  <Image
                    src="/giftologi-icon.svg"
                    alt="Giftologi"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <div className="relative w-24 h-24">
                  <Image
                    src={product.image || "/host/toaster.png"}
                    alt={product.title}
                    fill
                    className="object-contain"
                    sizes="96px"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="flex-1 p-8">
            <DialogTitle className="text-xl font-semibold text-gray-900 mb-6">
              Contact Information of Gifter
            </DialogTitle>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder={`Special message for ${hostName || "Host"}`}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder={`Special message for ${hostName || "Host"}`}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B]"
                  />
                </div>
              </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="mail@email.com"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] ${
                      errors.email ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="0244000000"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] ${
                      errors.phone ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                  )}
                </div>

                {/* Stay Anonymous */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      formData.stayAnonymous
                        ? "bg-[#A5914B] border-[#A5914B]"
                        : "border-gray-300"
                    }`}
                    onClick={() =>
                      updateField("stayAnonymous", !formData.stayAnonymous)
                    }
                  >
                    {formData.stayAnonymous && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm text-gray-600">Stay Anonymous</span>
                </label>

                {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer"
                >
                  Send Message
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 py-3 border border-[#A5914B] text-[#A5914B] font-medium rounded-full hover:bg-[#A5914B]/5 transition-colors cursor-pointer"
                >
                  Skip
                </button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

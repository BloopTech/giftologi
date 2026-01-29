"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../../../components/Dialog";
import { X } from "lucide-react";

export default function AddMessageModal({
  open,
  onOpenChange,
  product,
  hostName,
  onSubmit,
  onSkip,
}) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(message);
  };

  const handleSkip = () => {
    onSkip?.();
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
              <div className="relative w-32 h-32">
                <Image
                  src={product.image || "/host/toaster.png"}
                  alt={product.title}
                  fill
                  className="object-contain"
                  sizes="128px"
                />
              </div>
            </div>
          )}

          {/* Form */}
          <div className="flex-1 p-8">
            <DialogTitle className="text-xl font-semibold text-gray-900 mb-6">
              Add a Message
            </DialogTitle>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Special message for ${hostName || "the host"}`}
                    rows={6}
                    className="w-full px-4 py-3 border border-[#F6E9B7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
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

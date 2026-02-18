"use client";
import React from "react";
import Image from "next/image";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../../../components/Dialog";
import { X } from "lucide-react";

export default function WelcomeNoteModal({
  open,
  onOpenChange,
  registry,
  event,
  host,
  welcomeNote,
}) {
  const displayName = host?.firstname
    ? `${host.firstname}${host?.lastname ? ` ${host.lastname}` : ""}`
    : "Your Hosts";

  const eventType = event?.type || "event";
  const isBabyShower =
    eventType?.toLowerCase().includes("baby") ||
    eventType?.toLowerCase().includes("shower");

  const defaultMessage = isBabyShower
    ? `We are really looking forward to welcoming our baby this year! We are so grateful to share this journey with you and we appreciate all the love and support we've received so far.\n\nThank you so much for your gift!`
    : `We are so excited to celebrate this special occasion with you! Thank you for being part of our journey and for your thoughtful generosity.\n\nThank you so much for your gift!`;

  const message = welcomeNote || defaultMessage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-2xl shadow-xl p-8">
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
            <span className="sr-only">Close</span>
        </DialogClose>

          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="w-20 h-20 rounded-full border-4 border-[#A5914B] flex items-center justify-center mb-6">
              <Image
                src="/giftologi-icon.svg"
                alt="Giftologi"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>

            {/* Title */}
            <DialogTitle className="text-2xl font-semibold text-[#85753C] mb-2">
              Welcome to My Gift List
            </DialogTitle>

            {/* Subtitle */}
            <p className="text-sm text-[#A5914B] mb-6">
              Dear Friends & Family,
            </p>

            {/* Message */}
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-6">
              {message}
            </div>

            {/* Sign off */}
            <p className="text-sm text-[#A5914B] mb-1">Love,</p>
            <p className="text-sm font-medium text-[#85753C] mb-8">
              {displayName}
            </p>

            {/* CTA Button */}
            <DialogClose asChild>
              <button className="w-full max-w-xs px-8 py-3 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer">
                Start Shopping
              </button>
            </DialogClose>
          </div>
      </DialogContent>
    </Dialog>
  );
}

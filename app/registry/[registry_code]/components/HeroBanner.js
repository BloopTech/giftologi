"use client";
import React from "react";
import Image from "next/image";

export default function HeroBanner({
  registry,
  event,
  host,
  onWelcomeNoteClick,
}) {
  const displayName = host?.firstname
    ? `${host.firstname}${host?.lastname ? ` ${host.lastname}` : ""}`
    : registry?.title || "Registry";

  const coverPhoto = registry?.cover_photo || event?.cover_photo || "";
  const eventType = event?.type || "Event";
  const eventDate = event?.date
    ? new Date(event.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const isBabyShower =
    eventType?.toLowerCase().includes("baby") ||
    eventType?.toLowerCase().includes("shower");

  return (
    <div className="relative w-full bg-[#B1D1FC] border border-[#D4D4D4] rounded-2xl overflow-hidden min-h-[280px]">
      {coverPhoto ? (
        <Image
          src={coverPhoto}
          alt={registry?.title || "Registry cover"}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 flex">
          {/* Left content */}
          <div className="relative z-10 flex flex-col justify-center p-8 w-1/2">
            <h1 className="text-[#85753C] text-3xl md:text-4xl font-bold font-serif">
              {displayName}
            </h1>
            <p className="text-[#85753C] text-sm uppercase tracking-wide mt-2">
              {eventType}
            </p>
            {eventDate && (
              <p className="text-[#85753C] text-xs uppercase tracking-wide mt-1">
                {eventDate}
              </p>
            )}
            {onWelcomeNoteClick && (
              <button
                onClick={onWelcomeNoteClick}
                className="mt-6 w-fit px-6 py-2.5 bg-[#A5914B] text-white text-sm font-medium rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer"
              >
                Welcome Note
              </button>
            )}
          </div>

          {/* Right decorative content */}
          <div className="relative w-1/2 flex items-center justify-center">
            {/* Hot air balloon */}
            <div className="absolute top-4 left-1/4">
              <Image
                src="/host/hotairballoon.svg"
                alt=""
                width={80}
                height={120}
                className="object-contain"
                aria-hidden="true"
              />
            </div>

            {/* It's a Boy/Girl text */}
            {isBabyShower && (
              <div className="relative z-10">
                <p
                  className="text-5xl md:text-6xl font-script text-[#F5A9B8] italic"
                  style={{ fontFamily: "cursive" }}
                >
                  it&apos;s a
                </p>
                <p
                  className="text-6xl md:text-7xl font-script text-[#87CEEB] italic -mt-2"
                  style={{ fontFamily: "cursive" }}
                >
                  Boy!
                </p>
              </div>
            )}

            {/* Balloons */}
            <div className="absolute top-0 right-4">
              <Image
                src="/host/balloons.svg"
                alt=""
                width={120}
                height={180}
                className="object-contain"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      )}

      {/* Overlay content when there's a cover photo */}
      {coverPhoto && (
        <div className="absolute inset-0 bg-linear-to-r from-[#B1D1FC]/90 to-transparent flex items-center">
          <div className="p-8">
            <h1 className="text-[#85753C] text-3xl md:text-4xl font-bold font-serif">
              {displayName}
            </h1>
            <p className="text-[#85753C] text-sm uppercase tracking-wide mt-2">
              {eventType}
            </p>
            {eventDate && (
              <p className="text-[#85753C] text-xs uppercase tracking-wide mt-1">
                {eventDate}
              </p>
            )}
            {onWelcomeNoteClick && (
              <button
                onClick={onWelcomeNoteClick}
                className="mt-6 w-fit px-6 py-2.5 bg-[#A5914B] text-white text-sm font-medium rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer"
              >
                Welcome Note
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

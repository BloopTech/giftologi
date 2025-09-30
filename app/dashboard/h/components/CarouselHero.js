"use client";

import React, { useState } from "react";
import Image from "next/image";

export default function CarouselHero({ items = [], openCreateRegistry }) {
  const [index, setIndex] = useState(0);

  const goTo = (i) => {
    if (!items?.length) return;
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    setIndex(clamped);
  };

  if (!items?.length) return null;

  return (
    <div className="w-full">
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((item) => (
            <div
              key={item.title}
              className="w-full flex-shrink-0 flex items-center space-x-16"
            >
              {/* Left: Dots + Text */}
              <div className="flex w-[50%] items-center min-h-[300px] space-x-6">
                {/* Vertical dots */}
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  {items.map((_, i) => (
                    <button
                      key={`dot-${i}`}
                      type="button"
                      aria-label={`Go to slide ${i + 1}`}
                      onClick={() => goTo(i)}
                      className={
                        "h-3 w-3 rounded-full border transition-colors duration-200 " +
                        (i === index
                          ? "bg-[#A5914B] border-[#A5914B]"
                          : "bg-transparent border-[#A5914B]/50 hover:border-[#A5914B]")
                      }
                    >
                      <span className="sr-only">Slide {i + 1}</span>
                    </button>
                  ))}
                </div>

                {/* Text content */}
                <div className="flex flex-col space-y-12 flex-1">
                  <div className="flex flex-col space-y-2 w-full">
                    <h1 className="text-[#85753C] text-xl">
                      Create a gift registry for your
                    </h1>
                    <p className="text-[#85753C] font-semibold text-4xl">
                      {item.title}
                    </p>
                  </div>
                  <button
                    onClick={openCreateRegistry}
                    className="w-fit text-white cursor-pointer text-xs/tight bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-2xl px-4 py-2 flex items-center"
                  >
                    Create a Registry
                  </button>
                </div>
              </div>

              {/* Right: Image */}
              <div className="relative h-[300px] w-[50%]">
                <div className="h-full w-full bg-[#E9E9ED] rounded-xl">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover rounded-xl"
                    priority
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

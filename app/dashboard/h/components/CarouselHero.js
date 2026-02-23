"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
  }),
};

const swipeConfidenceThreshold = 8000;
const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

export default function CarouselHero({ items = [], openCreateRegistry }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const total = items.length;

  const goTo = useCallback(
    (i, nextDirection = 1) => {
      if (!total) return;
      const wrapped = ((i % total) + total) % total;
      setDirection(nextDirection);
      setIndex(wrapped);
    },
    [total]
  );

  const goNext = useCallback(() => {
    goTo(index + 1, 1);
  }, [goTo, index]);

  const goPrev = useCallback(() => {
    goTo(index - 1, -1);
  }, [goTo, index]);

  useEffect(() => {
    if (!total) return;
    if (index > total - 1) {
      setIndex(0);
    }
  }, [index, total]);

  useEffect(() => {
    if (isPaused || total < 2) return;

    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % total);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [isPaused, total]);

  if (!total) return null;

  const currentItem = items[index] || items[0];

  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden rounded-2xl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={`${currentItem.title}-${index}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 320, damping: 32 },
              opacity: { duration: 0.2 },
            }}
            drag={total > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              const swipe = swipePower(info.offset.x, info.velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                goNext();
              } else if (swipe > swipeConfidenceThreshold) {
                goPrev();
              }
            }}
            className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12"
          >
            <div className="order-2 lg:order-1 flex min-h-[260px] w-full items-center">
              <div className="flex flex-1 flex-col space-y-12">
                <div className="flex w-full flex-col space-y-2">
                  <h1 className="text-xl text-[#85753C]">Create a gift registry for your</h1>
                  <p className="text-4xl font-semibold text-[#85753C]">{currentItem.title}</p>
                </div>
                <div>
                  <button
                    onClick={openCreateRegistry}
                    className="flex w-fit cursor-pointer items-center rounded-2xl border border-[#A5914B] bg-[#A5914B] px-4 py-2 text-xs/tight text-white hover:bg-white hover:text-[#A5914B]"
                  >
                    Create a Registry
                  </button>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 w-full">
              <div className="relative h-[260px] w-full overflow-hidden rounded-xl bg-[#E9E9ED] md:h-[320px]">
                <Image
                  src={currentItem.image}
                  alt={currentItem.title}
                  fill
                  className="rounded-xl object-cover"
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 border border-[#D7D2BF] text-[#85753C] p-2 shadow-sm hover:bg-white"
            >
              <ChevronLeft className="size-4" />
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 border border-[#D7D2BF] text-[#85753C] p-2 shadow-sm hover:bg-white"
            >
              <ChevronRight className="size-4" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {items.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => {
                    if (i === index) return;
                    goTo(i, i > index ? 1 : -1);
                  }}
                  className={
                    "h-2.5 w-2.5 rounded-full border transition-colors duration-200 " +
                    (i === index
                      ? "bg-[#A5914B] border-[#A5914B]"
                      : "bg-white/80 border-[#A5914B]/50 hover:border-[#A5914B]")
                  }
                >
                  <span className="sr-only">Slide {i + 1}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

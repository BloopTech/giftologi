"use client";
import React, { useActionState } from "react";
import {
  subscribeToLandingNewsletter,
  initialNewsletterState,
} from "../landing-page/actions";

export default function NewsletterSubscription() {
  const [newsletterState, newsletterAction, newsletterPending] = useActionState(
    subscribeToLandingNewsletter,
    initialNewsletterState,
  );

  return (
    <section className="px-5 sm:px-8 lg:px-14 py-20 bg-[#F8F6EF]">
      <div className="mx-auto max-w-6xl rounded-[2.25rem] border border-[#ECE7D8] bg-white/85 backdrop-blur-sm px-6 py-8 sm:px-12 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-3">
            <div className="flex items-center space-x-4 mb-8">
              <div className="h-px w-12 bg-[#FDD17D]"></div>
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#667085] font-semibold">
                The Inner Circle
              </p>
            </div>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
              Curating your
              <span className="block italic text-[#FDD17D] font-brasley-medium mt-1">
                most beautiful moments.
              </span>
            </h2>
            <p className="mt-4 text-[#667085] max-w-md text-xl leading-relaxed font-brasley-medium italic">
              Join our community for exclusive boutique vendor access and expert
              gift guides.
            </p>
          </div>

          <div className="lg:col-span-2">
            <form
              action={newsletterAction}
              className="rounded-full border border-[#E7E2D3] bg-white shadow-[0_10px_30px_rgba(17,24,39,0.08)] p-1.5 flex flex-col sm:flex-row gap-1.5"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="w-full rounded-full px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#98A2B3] outline-none"
              />
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />
              <button
                type="submit"
                disabled={newsletterPending}
                className="rounded-full bg-[#081229] text-white px-7 py-3 text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-[#0F1E3E] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {newsletterPending ? "Submitting..." : "Subscribe"}
              </button>
            </form>

            {newsletterState?.error ? (
              <p className="mt-3 text-sm text-red-600">
                {newsletterState.error}
              </p>
            ) : null}

            {newsletterState?.success && newsletterState?.message ? (
              <p className="mt-3 text-sm text-green-700">
                {newsletterState.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

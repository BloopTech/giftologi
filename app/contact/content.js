"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Mail, Phone, Clock3, MapPin, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import PublicNavbar from "../components/PublicNavbar";
import Footer from "../components/footer";
import { useContactContext } from "./context";

const INITIAL_FORM = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export default function ContactContent() {
  const { settings, loading, error, refresh, submitContactForm } = useContactContext() || {};
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const cards = useMemo(
    () => [
      {
        key: "email",
        label: "Support Email",
        value: settings?.support_email || "Not provided yet",
        icon: Mail,
        href: settings?.support_email ? `mailto:${settings.support_email}` : null,
      },
      {
        key: "phone",
        label: "Support Phone",
        value: settings?.support_phone || "Not provided yet",
        icon: Phone,
        href: settings?.support_phone ? `tel:${settings.support_phone}` : null,
      },
      {
        key: "hours",
        label: "Business Hours",
        value: settings?.business_hours || "Not provided yet",
        icon: Clock3,
        href: null,
      },
      {
        key: "address",
        label: "Office Address",
        value: settings?.office_address || "Not provided yet",
        icon: MapPin,
        href: null,
      },
    ],
    [settings],
  );

  const onChangeField = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    const result = await submitContactForm?.({
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message,
    });

    if (!result?.ok) {
      toast.error(result?.error || "Failed to send your message.");
      setSubmitting(false);
      return;
    }

    toast.success("Thanks! Your message has been sent.");
    setForm(INITIAL_FORM);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#FCFCFB] text-[#111827]">
      <PublicNavbar />

      <section className="pt-36 pb-20 px-5 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-3xl border border-[#ECECEC] bg-white p-8 sm:p-10">
            <div className="flex items-center gap-2 text-[#A5914B]">
              <MessageSquareText className="size-5" />
              <span className="text-xs font-semibold tracking-[0.16em] uppercase">Contact</span>
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl font-didot-bold text-[#101828]">
              Get in touch with Giftologi
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#667085] max-w-2xl leading-relaxed">
              Contact details are managed from the admin Content & Policy pages. Use the form
              below and your message will appear in admin Contact Form Submissions.
            </p>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={refresh}
                className="mt-3 inline-flex text-sm text-red-700 underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 rounded-2xl border border-[#E5E7EB] bg-white animate-pulse"
                    />
                  ))
                : cards.map((card) => {
                    const Icon = card.icon;
                    const content = (
                      <>
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F5EA] text-[#A5914B]">
                          <Icon className="size-4" />
                        </div>
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#98A2B3]">
                            {card.label}
                          </p>
                          <p className="mt-1 text-sm text-[#344054] whitespace-pre-line break-words">
                            {card.value}
                          </p>
                        </div>
                      </>
                    );

                    return card.href ? (
                      <Link
                        key={card.key}
                        href={card.href}
                        className="block rounded-2xl border border-[#E5E7EB] bg-white p-5 hover:border-[#D6C9A0] transition-colors"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        key={card.key}
                        className="rounded-2xl border border-[#E5E7EB] bg-white p-5"
                      >
                        {content}
                      </div>
                    );
                  })}

              <Link
                href="/faq"
                className="inline-flex items-center justify-center rounded-full border border-[#D0D5DD] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#344054] hover:bg-[#F9FAFB] transition-colors"
              >
                Visit FAQs
              </Link>
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-7">
              <h2 className="text-xl font-semibold text-[#111827]">Send us a message</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                We&apos;ll review and respond as soon as possible.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-medium text-[#344054] mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={form.name}
                      onChange={onChangeField("name")}
                      maxLength={120}
                      required
                      className="w-full rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#A5914B]"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-medium text-[#344054] mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={onChangeField("email")}
                      maxLength={254}
                      required
                      className="w-full rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#A5914B]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-medium text-[#344054] mb-1.5">
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={form.subject}
                    onChange={onChangeField("subject")}
                    maxLength={200}
                    className="w-full rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#A5914B]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-[#344054] mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    value={form.message}
                    onChange={onChangeField("message")}
                    rows={6}
                    maxLength={5000}
                    required
                    className="w-full rounded-2xl border border-[#D0D5DD] px-3 py-3 text-sm text-[#111827] outline-none focus:border-[#A5914B] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-full bg-[#A5914B] px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#8B7A3F] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

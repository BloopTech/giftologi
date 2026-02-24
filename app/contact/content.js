"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, Mail, Phone, Clock3, MapPin } from "lucide-react";
import { toast } from "sonner";
import PublicNavbar from "../components/PublicNavbar";
import Footer from "../components/footer";
import { useContactContext } from "./context";
import NewsletterSubscription from "../components/NewsletterSubscription";
import Image from "next/image";

const INITIAL_FORM = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export default function ContactContent() {
  const { settings, loading, error, refresh, submitContactForm } =
    useContactContext() || {};
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const supportEmail = settings?.support_email || "response@giftologi.com";
  const businessHours = settings?.business_hours || "Mon — Fri, 10am — 6pm EST";

  const cards = useMemo(
    () => [
      {
        key: "email",
        label: "Support Email",
        value: settings?.support_email || "Not provided yet",
        icon: Mail,
        href: settings?.support_email
          ? `mailto:${settings.support_email}`
          : null,
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
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      <PublicNavbar />

      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'url("/pattern.png")',
          backgroundSize: "400px",
        }}
      ></div>

      <main className="flex-1 pt-32 relative z-10">
        {/* Immersive Branding Header */}
        <div className="px-6 sm:px-12 lg:px-24 mb-32">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-end">
            <div className="space-y-12">
              <div className="flex items-center space-x-6">
                <span className="w-12 h-px bg-[#FDD17D]"></span>
                <h4 className="text-[13px] font-sans font-semibold tracking-[0.5em] text-gray-400 uppercase">
                  Contact Concierge
                </h4>
              </div>
              <h1 className="text-6xl md:text-8xl font-serif font-bold text-gray-950 leading-[0.9] tracking-tighter">
                Let&apos;s <br />
                <span className="italic font-light text-[#FDD17D] drop-shadow-sm">
                  Connect.
                </span>
              </h1>
            </div>
            <div className="max-w-md pb-6">
              <p className="text-xl md:text-2xl text-gray-500 font-sans font-medium leading-relaxed">
                We believe every celebration begins with an intentional
                connection. Our team is here to ensure your journey is as
                seamless as it is beautiful.
              </p>
            </div>
          </div>
        </div>

        {/* The "Note" Style Form Section */}
        <div className="relative px-6 sm:px-12 lg:px-24 mb-44">
          {/* Artistic Background Element */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#FCFAF2] rounded-l-[10rem] -z-10 hidden lg:block"></div>

          <div className="max-w-6xl mx-auto">
            <div className="bg-white lg:rounded-[4rem] border-y lg:border border-gray-100 p-8 md:p-20 lg:p-32 shadow-2xl shadow-gray-200/40 relative overflow-hidden">
              {loading ? (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
                  <p className="text-sm font-semibold text-gray-500 tracking-[0.2em] uppercase">
                    Loading contact details...
                  </p>
                </div>
              ) : null}
              {/* Texture Watermark */}
              <div className="absolute top-12 right-12 text-[20rem] font-serif font-bold text-gray-50/50 -rotate-12 pointer-events-none select-none">
                G
              </div>

              <form onSubmit={handleSubmit} className="relative z-10 space-y-24">
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {cards.map((card) => {
                    const Icon = card.icon;

                    return (
                      <div
                        key={card.key}
                        className="rounded-2xl border border-gray-100 px-5 py-4 bg-[#FFFCF2]"
                      >
                        <p className="text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-gray-400 mb-2">
                          {card.label}
                        </p>
                        <p className="text-sm font-semibold text-gray-800 break-words">
                          {card.value}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <Icon size={16} className="text-[#B99142]" />
                          {card.href ? (
                            <a
                              href={card.href}
                              className="text-xs font-semibold text-[#B99142] hover:underline"
                            >
                              Open
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center justify-between gap-4">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={refresh}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : null}

                <div className="grid md:grid-cols-2 gap-x-20 gap-y-16">
                  <div className="space-y-4 group">
                    <p className="text-[11px] font-sans font-bold text-gray-900 uppercase tracking-[0.3em] transition-colors">
                      Personal Details
                    </p>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={onChangeField("name")}
                      placeholder="Your Full Name"
                      required
                      className="w-full text-2xl md:text-3xl font-sans font-semibold text-gray-900 border-b border-gray-200 py-4 outline-none focus:border-[#FDD17D] transition-all bg-transparent placeholder:text-gray-300"
                    />
                  </div>
                  <div className="space-y-4 group">
                    <p className="text-[11px] font-sans font-bold text-gray-900 uppercase tracking-[0.3em] transition-colors">
                      Direct Correspondence
                    </p>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChangeField("email")}
                      placeholder="Your Email Address"
                      required
                      className="w-full text-2xl md:text-3xl font-sans font-semibold text-gray-900 border-b border-gray-200 py-4 outline-none focus:border-[#FDD17D] transition-all bg-transparent placeholder:text-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-4 group">
                  <p className="text-[11px] font-sans font-bold text-gray-900 uppercase tracking-[0.3em] transition-colors">
                    Subject of Interest
                  </p>
                  <div className="flex flex-wrap gap-4 pt-4">
                    {[
                      "Registry Support",
                      "Brand Partnership",
                      "Media Inquiry",
                      "Something Else",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, subject: tag }))}
                        className={`px-8 py-4 rounded-full border text-sm font-sans font-semibold transition-all duration-300 ${form.subject === tag ? "border-[#FDD17D] bg-[#FFF8E7] text-gray-950" : "border-gray-100 text-gray-500 hover:border-[#FDD17D] hover:text-gray-950 bg-gray-50/30"}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={onChangeField("subject")}
                    placeholder="Or type your own subject"
                    className="w-full text-base font-sans text-gray-800 border-b border-gray-200 py-3 outline-none focus:border-[#FDD17D] transition-all bg-transparent placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-4 group">
                  <p className="text-[11px] font-sans font-bold text-gray-900 uppercase tracking-[0.3em] transition-colors">
                    Your Message
                  </p>
                  <textarea
                    rows="2"
                    name="message"
                    value={form.message}
                    onChange={onChangeField("message")}
                    placeholder="How can we help elevate your experience?"
                    required
                    className="w-full text-2xl md:text-3xl font-sans font-semibold text-gray-900 border-b border-gray-200 py-4 outline-none focus:border-[#FDD17D] transition-all bg-transparent placeholder:text-gray-300 resize-none"
                  ></textarea>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-12 pt-12">
                  <div className="flex items-center space-x-12">
                    <div className="space-y-2">
                      <p className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest">
                        Office Hours
                      </p>
                      <p className="text-sm font-sans font-bold text-gray-900">
                        {businessHours}
                      </p>
                    </div>
                    <div className="w-px h-10 bg-gray-100 hidden sm:block"></div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest">
                        Global Support
                      </p>
                      <p className="text-sm font-sans font-bold text-gray-900">
                        {supportEmail}
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#FDD17D] text-gray-900 px-16 py-8 rounded-full text-xs font-bold tracking-[0.3em] uppercase hover:bg-gray-900 hover:text-white transition-all duration-700 shadow-[0_20px_40px_rgba(212,175,55,0.2)] hover:shadow-2xl flex items-center space-x-6 group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>{submitting ? "Sending..." : "Send Message"}</span>
                    <ArrowRight
                      size={20}
                      className="transform group-hover:translate-x-2 transition-transform duration-500"
                    />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Visual Anchor Section */}
        <div className="px-6 sm:px-12 lg:px-24 pb-32">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 h-[400px]">
            <div className="rounded-[4rem] overflow-hidden group relative">
              <Image
                src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2000"
                alt="Giftologi contact experience"
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="bg-gray-950 rounded-[4rem] p-12 md:p-20 flex flex-col justify-between text-white overflow-hidden relative">
              {/* Subtle Gold Pulse */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDD17D] opacity-10 rounded-full blur-[100px]"></div>

              <h3 className="text-4xl md:text-5xl font-serif font-bold leading-tight relative z-10">
                Exceptional <br />
                curated for the <br />
                <span className="text-[#FDD17D] italic font-light leading-none">
                  intentional.
                </span>
              </h3>

              <div className="flex items-center space-x-6 relative z-10">
                <span className="text-xs font-sans font-bold tracking-[0.4em] uppercase text-gray-500">
                  Discover Excellence
                </span>
                <div className="h-px w-24 bg-gray-800"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <NewsletterSubscription />
      <Footer />
    </div>
  );
}

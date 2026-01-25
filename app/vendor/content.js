"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Store,
  Users,
  TrendingUp,
  DollarSign,
  BarChart3,
  CreditCard,
  Headphones,
  ArrowRight,
  Home,
} from "lucide-react";
import logo from "../../public/giftologi-logo.png";
import ApplicationModal from "./components/ApplicationModal";

// Header Component
function VendorHeader() {
  return (
    <header className="w-full bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square items-center justify-center">
            <Image src={logo} alt="logo" width={40} height={40} priority />
          </div>

          <span className="font-medium text-[#85753C] font-poppins flex items-center">
            Giftologi
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/v/profile"
            className="px-5 py-2 border border-[#BBA96C] rounded-full text-sm font-medium text-gray-700 hover:bg-[#BBA96C] hover:text-white transition-colors"
          >
            Vendor Profile
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 bg-[#BBA96C] border border-[#BBA96C] text-white rounded-full text-sm font-medium hover:bg-white hover:text-gray-700 transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    </header>
  );
}

// Hero Section
function HeroSection({ onOpenModal }) {
  return (
    <section className="bg-white py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="inline-block px-4 py-2 bg-[#F5F0E1] rounded-full text-sm text-[#85753C] font-medium mb-6">
          Join Our Vendor Network
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Sell Your Products to
          <br />
          Gift Buyers Everywhere
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
          Partner with the leading gift registry platform and connect your
          products with thousands of engaged customers ready to purchase.
        </p>
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={onOpenModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#BBA96C] text-white rounded-full font-medium hover:bg-white hover:text-[#a89558] border border-[#a89558] transition-colors cursor-pointer"
          >
            Start Your Application
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href="#why-sell"
            className="px-6 py-3 border border-gray-300 rounded-full font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}

// Stats Section
function StatsSection() {
  const stats = [
    { value: "10K+", label: "Active Registries" },
    { value: "$2M+", label: "Monthly Sales" },
    { value: "500+", label: "Trusted Vendors" },
    { value: "98%", label: "Satisfaction Rate" },
  ];

  return (
    <section className="bg-white pb-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 text-center"
            >
              <div className="text-3xl font-bold text-[#BBA96C] mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Why Sell With Us Section
function WhySellSection() {
  const features = [
    {
      icon: Users,
      title: "Access to Thousands of Customers",
      description:
        "Reach gift givers and registry creators looking for quality products",
    },
    {
      icon: TrendingUp,
      title: "Grow Your Business",
      description:
        "Leverage our platform to increase your sales and brand visibility",
    },
    {
      icon: DollarSign,
      title: "Competitive Commission Rates",
      description:
        "Keep more of your earnings with our transparent 15% commission structure",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Track your performance with detailed sales reports and insights",
    },
    {
      icon: CreditCard,
      title: "Secure Payments",
      description: "Bi-monthly payouts directly to your bank account",
    },
    {
      icon: Headphones,
      title: "Dedicated Support",
      description: "24/7 vendor support team to help you succeed",
    },
  ];

  return (
    <section id="why-sell" className="bg-[#FFFCEF] py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#85753C] mb-3">
            Why Sell With Us?
          </h2>
          <p className="text-gray-600">
            Everything you need to grow your business online
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6"
            >
              <div className="w-12 h-12 bg-[#F5F0E1] rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-[#BBA96C]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// How It Works Section
function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: "Apply",
      description: "Complete our simple vendor application form",
    },
    {
      number: 2,
      title: "Get Approved",
      description: "Our team reviews your application within 2-3 business days",
    },
    {
      number: 3,
      title: "Add Products",
      description: "Upload your product catalog and set your prices",
    },
    {
      number: 4,
      title: "Start Selling",
      description: "Receive orders and grow your business with us",
    },
  ];

  return (
    <section className="bg-[#FFFCEF] py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            How It Works
          </h2>
          <p className="text-gray-600">Get started in four simple steps</p>
        </div>
        <div className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-[#E5DFC8]" />

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center relative">
                <div className="w-16 h-16 bg-[#BBA96C] rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                  <span className="text-white font-bold text-xl">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Ready to Get Started CTA Section
function CTASection({ onOpenModal }) {
  return (
    <section className="bg-[#FFFCEF] py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-[#BBA96C] rounded-xl flex items-center justify-center mx-auto mb-6">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 mb-2">
            Join hundreds of successful vendors already selling on our platform.
          </p>
          <p className="text-gray-600 mb-8">
            Application takes less than 10 minutes.
          </p>
          <button
            onClick={onOpenModal}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#BBA96C] text-white rounded-full font-medium hover:bg-white hover:text-[#a89558] border border-[#a89558] transition-colors cursor-pointer"
          >
            Apply Now
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-sm text-gray-500 mt-6">
            Questions? Contact us at{" "}
            <Link
              href="mailto:vendors@mygiftologi.com"
              className="text-[#85753C] hover:underline"
            >
              vendors@mygiftologi.com
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// Footer Component
function VendorFooter() {
  const companyInfo = [
    { title: "About Us", href: "/about" },
    { title: "Wedding Guides", href: "/wedding-guides" },
    { title: "Baby Guides", href: "/baby-guides" },
    {
      title: "What is a Universal Gift List?",
      href: "/what-is-a-universal-gift-list",
    },
    { title: "Contact Us", href: "/contact" },
    { title: "News and Press Releases", href: "/news" },
    { title: "Terms and Conditions", href: "/terms-and-conditions" },
    { title: "Privacy Statement", href: "/privacy-statement" },
    { title: "Careers", href: "/careers" },
  ];

  const members = [
    { title: "About Us", href: "/about" },
    { title: "Wedding Guides", href: "/wedding-guides" },
    { title: "Baby Guides", href: "/baby-guides" },
    {
      title: "What is a Universal Gift List?",
      href: "/what-is-a-universal-gift-list",
    },
    { title: "Contact Us", href: "/contact" },
    { title: "News and Press Releases", href: "/news" },
    { title: "Terms and Conditions", href: "/terms-and-conditions" },
    { title: "Privacy Statement", href: "/privacy-statement" },
    { title: "Careers", href: "/careers" },
  ];

  const partners = [
    { title: "Partner Login", href: "/partner/login" },
    { title: "Partner Blog", href: "/partner/blog" },
    { title: "Advertise with Us", href: "/advertise-with-us" },
    { title: "Partner with Us", href: "/partner-with-us" },
  ];

  return (
    <footer className="bg-[#E8E8E8] py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          <div className="flex flex-col space-y-4">
            <h3 className="font-semibold text-[#85753C]">Company Info</h3>
            <div className="flex flex-col space-y-2">
              {companyInfo.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="text-xs text-gray-500 hover:text-[#85753C]"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col space-y-4">
            <h3 className="font-semibold text-[#85753C]">For Members</h3>
            <div className="flex flex-col space-y-2">
              {members.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="text-xs text-gray-500 hover:text-[#85753C]"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col space-y-4">
            <h3 className="font-semibold text-[#85753C]">For Partners</h3>
            <div className="flex flex-col space-y-2">
              {partners.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="text-xs text-gray-500 hover:text-[#85753C]"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 flex flex-col space-y-4">
            <h3 className="font-semibold text-[#85753C]">Connect with Us</h3>
            <div className="flex flex-col space-y-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="border border-gray-300 bg-white text-gray-800 rounded-lg px-4 py-2 text-sm focus:border-[#BBA96C] focus:ring-1 focus:ring-[#BBA96C] focus:outline-none"
              />
              <button className="w-fit text-white cursor-pointer text-sm bg-[#BBA96C] hover:bg-[#a89558] rounded-lg px-6 py-2 transition-colors">
                Contact Us
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-300 pt-6">
          <p className="text-xs text-gray-500">
            2025 All rights reserved - Giftologi LLC —{" "}
            <Link href="/sitemap" className="text-[#85753C] hover:underline">
              Site Map
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function VendorLandingPageContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-white">
      <VendorHeader />
      <HeroSection onOpenModal={openModal} />
      <StatsSection />
      <WhySellSection />
      <HowItWorksSection />
      <CTASection onOpenModal={openModal} />
      <VendorFooter />
      <ApplicationModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

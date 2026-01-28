"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import Footer from "../../components/footer";
import { Store, MapPin, BadgeCheck, AlertTriangle } from "lucide-react";

export default function StorefrontContent({ vendor, products }) {
  const isClosed = (vendor?.shop_status || "").toLowerCase() === "closed";
  const hasProducts = Array.isArray(products) && products.length > 0;
  const logoSrc = vendor?.logo_url || vendor?.logo || "/host/toaster.png";

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-poppins min-h-screen">
      <Link
        href="#storefront-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
      >
        Skip to main content
      </Link>

      <main
        id="storefront-main-content"
        role="main"
        tabIndex={-1}
        aria-label={`${vendor?.business_name || "Vendor"} storefront`}
        className="flex flex-col space-y-8 w-full px-4"
      >
        {/* Closed Shop Banner */}
        {isClosed && (
          <div className="w-full rounded-lg border border-red-300 bg-red-50 p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <p className="text-red-800 font-semibold text-sm">
                This shop is currently closed
              </p>
              <p className="text-red-700 text-xs mt-1">
                This vendor has closed their shop and is no longer accepting orders.
                Products are displayed for reference only.
              </p>
            </div>
          </div>
        )}

        {/* Vendor Header */}
        <div className="w-full rounded-2xl border border-[#DCDCDE] p-6 bg-white flex flex-col sm:flex-row gap-6 items-start">
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
              <Image
                src={logoSrc}
                alt={vendor?.business_name || "Vendor logo"}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[#394B71] text-2xl font-bold truncate">
                {vendor?.business_name || "Vendor"}
              </h1>
              {vendor?.verified && (
                <BadgeCheck className="size-5 text-blue-500 shrink-0" />
              )}
              {isClosed && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  Closed
                </span>
              )}
            </div>
            {vendor?.category && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-[#6A7282]">
                <Store className="size-4" />
                <span>{vendor.category}</span>
              </div>
            )}
            {(vendor?.address_city || vendor?.address_country) && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-[#6A7282]">
                <MapPin className="size-4" />
                <span>
                  {[vendor.address_city, vendor.address_country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            {vendor?.description && (
              <p className="text-sm text-[#6A7282] mt-3 line-clamp-3">
                {vendor.description}
              </p>
            )}
          </div>
        </div>

        {/* Products Section */}
        <div className="w-full rounded-2xl border border-[#DCDCDE] p-6 bg-white flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[#394B71] text-lg font-semibold">
              Products
              {hasProducts && (
                <span className="text-sm font-normal text-[#6A7282] ml-2">
                  ({products.length})
                </span>
              )}
            </h2>
          </div>

          {hasProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className={`flex bg-white rounded-lg flex-col space-y-3 p-4 w-full border ${
                    isClosed ? "border-gray-200 opacity-75" : "border-[#E5E7EB]"
                  } hover:shadow-sm transition-shadow`}
                >
                  <div className="flex items-center justify-center aspect-square rounded-lg overflow-hidden bg-gray-50">
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={150}
                      height={150}
                      className="object-contain w-full h-full"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {p.name}
                    </p>
                    <p className="text-sm font-semibold text-[#A5914B]">
                      {p.price}
                    </p>
                    {p.stock <= 0 && (
                      <span className="text-xs text-red-600">Out of stock</span>
                    )}
                  </div>
                  {!isClosed && p.stock > 0 && (
                    <button
                      className="mt-auto text-xs text-white cursor-pointer bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-lg px-3 py-2 flex items-center justify-center transition-colors"
                    >
                      View Product
                    </button>
                  )}
                  {isClosed && (
                    <div className="mt-auto text-xs text-center text-gray-400 py-2">
                      Shop closed
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-[#6A7282]">
              {isClosed
                ? "This shop has no products to display."
                : "No products available at the moment."}
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}

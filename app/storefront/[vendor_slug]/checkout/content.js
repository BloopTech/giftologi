"use client";
import React, { useState, useCallback, useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Minus,
  Plus,
  CreditCard,
  Truck,
  MapPin,
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { processStorefrontCheckout } from "./actions";

const SHIPPING_REGIONS = [
  { id: "accra", name: "Greater Accra", fee: 25 },
  { id: "kumasi", name: "Ashanti Region", fee: 35 },
  { id: "takoradi", name: "Western Region", fee: 40 },
  { id: "tamale", name: "Northern Region", fee: 50 },
  { id: "cape_coast", name: "Central Region", fee: 35 },
  { id: "ho", name: "Volta Region", fee: 40 },
  { id: "other", name: "Other Regions", fee: 55 },
];

const formatPrice = (value) => {
  if (value === null || value === undefined) return "GHS 0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS 0.00";
  return `GHS ${num.toFixed(2)}`;
};

export default function CheckoutContent({
  vendor,
  product,
  initialQuantity,
  selectedVariation,
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selectedRegion, setSelectedRegion] = useState(SHIPPING_REGIONS[0]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    digitalAddress: "",
    notes: "",
  });

  const logoSrc = vendor?.logo_url || vendor?.logo || "/host/toaster.png";
  const basePrice = Number(product?.rawPrice ?? product?.basePrice);
  const variationPrice = Number(selectedVariation?.price);
  const unitPrice = Number.isFinite(variationPrice)
    ? variationPrice
    : Number.isFinite(basePrice)
    ? basePrice
    : 0;
  const subtotal = unitPrice * quantity;
  const shippingFee = selectedRegion.fee;
  const total = subtotal + shippingFee;

  const [state, formAction, isPending] = useActionState(
    processStorefrontCheckout,
    { success: false, error: null }
  );

  const handleQuantityChange = useCallback(
    (delta) => {
      setQuantity((prev) => {
        const next = prev + delta;
        if (next < 1) return 1;
        if (next > product.stock) return product.stock;
        return next;
      });
    },
    [product.stock]
  );

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRegionChange = useCallback((e) => {
    const region = SHIPPING_REGIONS.find((r) => r.id === e.target.value);
    if (region) setSelectedRegion(region);
  }, []);

  if (state.success && state.checkoutUrl) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Created!
          </h1>
          <p className="text-gray-600 mb-6">
            Your order has been created. You will be redirected to complete
            payment.
          </p>
          <a
            href={state.checkoutUrl}
            className="inline-block w-full bg-[#A5914B] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#8B7A3F] transition-colors"
          >
            Proceed to Payment
          </a>
          <p className="text-xs text-gray-500 mt-4">
            Order Reference: {state.orderCode}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-950 font-poppins">
      <div className="mx-auto max-w-6xl w-full py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/storefront/${vendor.slug}/${product.id}`}
            className="flex items-center gap-2 text-gray-600 hover:text-[#A5914B] transition-colors"
          >
            <ChevronLeft className="size-5" />
            <span className="text-sm font-medium">Back to Product</span>
          </Link>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-green-600" />
            <span className="text-sm text-gray-600">Secure Checkout</span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
          Checkout
        </h1>

        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Form */}
          <div className="lg:w-2/3 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="size-5 text-[#A5914B]" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <Mail className="size-4 inline mr-1" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <Phone className="size-4 inline mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="0244123456"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="size-5 text-[#A5914B]" />
                Shipping Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="region"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Region *
                  </label>
                  <select
                    id="region"
                    name="region"
                    required
                    value={selectedRegion.id}
                    onChange={handleRegionChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors bg-white"
                  >
                    {SHIPPING_REGIONS.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name} - {formatPrice(region.fee)} shipping
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    City/Town *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="Accra"
                  />
                </div>
                <div>
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="123 Main Street, East Legon"
                  />
                </div>
                <div>
                  <label
                    htmlFor="digitalAddress"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Ghana Post Digital Address
                  </label>
                  <input
                    type="text"
                    id="digitalAddress"
                    name="digitalAddress"
                    value={formData.digitalAddress}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="GA-123-4567"
                  />
                </div>
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Delivery Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors resize-none"
                    placeholder="Any special delivery instructions..."
                  />
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 flex items-start gap-3">
              <Truck className="size-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Delivery by Aramex
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Estimated delivery: 2-5 business days depending on your
                  location. You will receive tracking information via email.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>

              {/* Vendor */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                  <Image
                    src={logoSrc}
                    alt={vendor.business_name}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {vendor.business_name}
                </span>
              </div>

              {/* Product */}
              <div className="py-4 border-b border-gray-100">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="object-contain w-full h-full p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-sm text-[#A5914B] font-semibold mt-1">
                      {formatPrice(unitPrice)}
                    </p>
                    {selectedVariation?.label && (
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedVariation.label}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-600">Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="p-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock}
                      className="p-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{formatPrice(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-[#A5914B]">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Hidden fields */}
              <input type="hidden" name="vendorId" value={vendor.id} />
              <input type="hidden" name="vendorSlug" value={vendor.slug} />
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="quantity" value={quantity} />
              <input type="hidden" name="subtotal" value={subtotal} />
              <input
                type="hidden"
                name="variantKey"
                value={selectedVariation?.key || ""}
              />
              <input
                type="hidden"
                name="variation"
                value={
                  selectedVariation?.raw
                    ? JSON.stringify(selectedVariation.raw)
                    : ""
                }
              />
              <input type="hidden" name="shippingFee" value={shippingFee} />
              <input type="hidden" name="shippingRegion" value={selectedRegion.name} />
              <input type="hidden" name="total" value={total} />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-4 bg-[#A5914B] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#8B7A3F] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="size-5" />
                    Pay {formatPrice(total)}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secured by ExpressPay. Your payment information is encrypted.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

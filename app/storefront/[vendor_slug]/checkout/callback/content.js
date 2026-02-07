"use client";
import React from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, Package, ArrowRight } from "lucide-react";

const formatPrice = (value, currency = "GHS") => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `${currency} ${num.toFixed(2)}`;
};

export default function CallbackContent({ order, vendor }) {
  const status = order?.status?.toLowerCase();
  const isSuccess = status === "paid" || status === "completed" || status === "processing";
  const isPending = status === "pending";
  const isFailed = status === "failed" || status === "cancelled";

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 font-brasley-medium">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="size-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn't find your order. Please check your email for order
            confirmation or contact support.
          </p>
          <Link
            href="/"
            className="inline-block w-full bg-[#A5914B] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#8B7A3F] transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 font-brasley-medium">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {isSuccess && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="size-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 mb-6">
              Thank you for your purchase, {order.buyer_firstname || "Customer"}!
              Your order has been confirmed and is being processed.
            </p>
          </>
        )}

        {isPending && (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="size-12 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Pending
            </h1>
            <p className="text-gray-600 mb-6">
              Your payment is being processed. We'll send you an email
              confirmation once it's complete.
            </p>
          </>
        )}

        {isFailed && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="size-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Failed
            </h1>
            <p className="text-gray-600 mb-6">
              Unfortunately, your payment could not be processed. Please try
              again or use a different payment method.
            </p>
          </>
        )}

        {/* Order Details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Order Details
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number</span>
              <span className="font-medium text-gray-900">
                #{order.order_code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount</span>
              <span className="font-medium text-[#A5914B]">
                {formatPrice(order.total_amount, order.currency)}
              </span>
            </div>
            {order.buyer_email && (
              <div className="flex justify-between">
                <span className="text-gray-600">Confirmation sent to</span>
                <span className="font-medium text-gray-900 truncate max-w-[180px]">
                  {order.buyer_email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        {isSuccess && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Package className="size-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  What's Next?
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  Your order will be shipped via Aramex. You'll receive tracking
                  information via email within 24-48 hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {vendor?.slug && (
            <Link
              href={`/storefront/${vendor.slug}`}
              className="flex items-center justify-center gap-2 w-full bg-[#A5914B] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#8B7A3F] transition-colors"
            >
              Continue Shopping
              <ArrowRight className="size-4" />
            </Link>
          )}
          <Link
            href="/order/lookup"
            className="flex items-center justify-center gap-2 w-full bg-white text-gray-700 font-semibold py-3 px-6 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Track Your Order
          </Link>
        </div>

        {isFailed && vendor?.slug && (
          <Link
            href={`/storefront/${vendor.slug}`}
            className="inline-block mt-4 text-sm text-[#A5914B] hover:underline"
          >
            Return to shop
          </Link>
        )}
      </div>
    </div>
  );
}

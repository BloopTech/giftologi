"use client";
import React from "react";
import Link from "next/link";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Footer from "@/app/components/footer";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatCurrency = (amount, currency = "GHS") => {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "—";
  return `${currency} ${num.toFixed(2)}`;
};

export default function ReceiptContent({ order, items }) {
  const buyerName =
    [order.buyer_firstname, order.buyer_lastname].filter(Boolean).join(" ") ||
    "Guest";
  const gifterName = [order.gifter_firstname, order.gifter_lastname]
    .filter(Boolean)
    .join(" ");

  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.total_price ?? item.price ?? 0);
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);

  const shippingFee = Number(order.shipping_fee ?? 0);
  const promoDiscount = Number(order.promo_discount ?? 0);
  const totalAmount = Number(order.total_amount ?? 0);
  const currency = order.currency || "GHS";

  const shippingLines = [
    order.shipping_address,
    order.shipping_city,
    order.shipping_region,
    order.shipping_digital_address,
  ].filter(Boolean);

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#F7F5F0] print:bg-white w-full pt-28 px-5 md:px-10">
        {/* Action bar — hidden on print */}
        <div className="no-print bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link
              href={`/order/${order.order_code}`}
              className="flex items-center gap-2 text-sm text-[#374151] hover:text-[#111827]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to order
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-full hover:bg-[#1F2937] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#374151] border border-[#D1D5DB] rounded-full hover:bg-white cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Save PDF
              </button>
            </div>
          </div>
        </div>

        {/* Receipt */}
        <div className="max-w-3xl mx-auto px-6 py-10 print-container">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 print:shadow-none print:border-none print:p-0 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#111827]">Receipt</h1>
                <p className="text-sm text-[#6B7280] mt-1">
                  Giftologi — Gift Registry Platform
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.15em] text-[#9CA3AF]">
                  Order Code
                </p>
                <p className="text-lg font-semibold text-[#111827] mt-0.5">
                  {order.order_code}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>

            <hr className="border-[#E5E7EB]" />

            {/* Buyer / Gifter info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">
                  {order.order_type === "registry" ? "Gifter" : "Buyer"}
                </p>
                <p className="text-sm font-medium text-[#111827]">
                  {gifterName || buyerName}
                </p>
                <p className="text-sm text-[#6B7280]">
                  {order.gifter_email || order.buyer_email || "—"}
                </p>
                {(order.gifter_phone || order.buyer_phone) && (
                  <p className="text-sm text-[#6B7280]">
                    {order.gifter_phone || order.buyer_phone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">
                  Shipping Address
                </p>
                {shippingLines.length > 0 ? (
                  shippingLines.map((line, i) => (
                    <p key={i} className="text-sm text-[#6B7280]">
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-[#6B7280]">—</p>
                )}
              </div>
            </div>

            {/* Payment info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#9CA3AF]">Status</p>
                <p className="text-sm font-medium text-[#111827] capitalize mt-0.5">
                  {order.status || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#9CA3AF]">Payment Method</p>
                <p className="text-sm font-medium text-[#111827] capitalize mt-0.5">
                  {order.payment_method || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-[#F9FAFB] p-3">
                <p className="text-xs text-[#9CA3AF]">Reference</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5 break-all">
                  {order.payment_reference || "—"}
                </p>
              </div>
            </div>

            {/* Line items */}
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#9CA3AF] mb-3">
                Items
              </p>
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F9FAFB] text-[#6B7280]">
                      <th className="text-left px-4 py-2.5 font-medium">
                        Product
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">
                        Vendor
                      </th>
                      <th className="text-center px-4 py-2.5 font-medium">
                        Qty
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium">
                        Unit Price
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const productName = item.product?.name || "Product";
                      const vendorName = item.vendor?.business_name || "—";
                      const qty = item.quantity ?? 1;
                      const unitPrice = Number(item.price ?? 0);
                      const lineTotal = Number(
                        item.total_price ?? unitPrice * qty,
                      );
                      return (
                        <tr key={item.id} className="border-t border-[#E5E7EB]">
                          <td className="px-4 py-3 text-[#111827] font-medium">
                            {productName}
                          </td>
                          <td className="px-4 py-3 text-[#6B7280] hidden sm:table-cell">
                            {vendorName}
                          </td>
                          <td className="px-4 py-3 text-center text-[#6B7280]">
                            {qty}
                          </td>
                          <td className="px-4 py-3 text-right text-[#6B7280]">
                            {formatCurrency(unitPrice, currency)}
                          </td>
                          <td className="px-4 py-3 text-right text-[#111827] font-medium">
                            {formatCurrency(lineTotal, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-2">
                <div className="flex justify-between text-sm text-[#6B7280]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-[#6B7280]">
                  <span>Shipping</span>
                  <span>
                    {shippingFee > 0
                      ? formatCurrency(shippingFee, currency)
                      : "Free"}
                  </span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      Discount{order.promo_code ? ` (${order.promo_code})` : ""}
                    </span>
                    <span>-{formatCurrency(promoDiscount, currency)}</span>
                  </div>
                )}
                <hr className="border-[#E5E7EB]" />
                <div className="flex justify-between text-base font-semibold text-[#111827]">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount, currency)}</span>
                </div>
              </div>
            </div>

            {/* Gift message */}
            {order.gift_message && (
              <div className="rounded-xl bg-[#FEFCE8] border border-[#FDE68A] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-[#92400E] mb-1">
                  Gift Message
                </p>
                <p className="text-sm text-[#78350F]">{order.gift_message}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-4 border-t border-[#E5E7EB]">
              <p className="text-xs text-[#9CA3AF]">
                Thank you for your purchase on Giftologi.
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                For support, visit{" "}
                <Link href="/support" className="text-primary hover:underline">
                  here
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}

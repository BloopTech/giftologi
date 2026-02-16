"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";

import {
  PiCurrencyCircleDollar,
  PiClock,
  PiCalendar,
  PiPercent,
  PiBank,
  PiCaretDown,
  PiExport,
  PiEye,
  PiEyeSlash,
  PiInfo,
  PiCheckCircle,
  PiWarning,
} from "react-icons/pi";
import { useVendorPayoutsContext } from "./context";
import {
  formatCurrency,
  formatDate,
  formatWeekPeriod,
  buildMaskedEnding,
  maskFullValue,
  getPayoutDisplayId,
  getStatusConfig,
  getTransactionDisplayId,
  StatCard,
  StatusBadge,
} from "./utils";

export default function VendorPayoutsContent() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const {
    payoutPeriods,
    paymentInfo,
    recentLineItems,
    commissionRate: vendorCommissionRate,
    loading,
    error,
  } = useVendorPayoutsContext();

  const commissionRate = useMemo(() => {
    const r = Number(vendorCommissionRate || 0);
    return Number.isFinite(r) ? r : 0;
  }, [vendorCommissionRate]);

  const hasPaymentInfo = !!(
    paymentInfo?.bank_account ||
    paymentInfo?.momo_number
  );

  const paymentMethodLabel = useMemo(() => {
    if (paymentInfo?.bank_name || paymentInfo?.bank_account) return "Bank Transfer";
    if (paymentInfo?.momo_number)
      return `MoMo${paymentInfo?.momo_network ? ` (${paymentInfo.momo_network})` : ""}`;
    return "Not set";
  }, [paymentInfo]);

  const filteredPeriods = useMemo(() => {
    if (!payoutPeriods?.length) return [];
    if (statusFilter === "all") return payoutPeriods;
    return payoutPeriods.filter((p) => p.status === statusFilter);
  }, [payoutPeriods, statusFilter]);

  const payoutRows = useMemo(() => {
    return filteredPeriods.map((p) => ({
      id: p.id,
      displayId: getPayoutDisplayId(p.id),
      period: formatWeekPeriod(p.week_start),
      weekStart: p.week_start,
      totalGross: Number(p.total_gross || 0),
      totalCommission: Number(p.total_commission || 0),
      totalVendorNet: Number(p.total_vendor_net || 0),
      totalItems: p.total_items ?? 0,
      totalOrders: p.total_orders ?? 0,
      paymentMethod: p.payment_method || paymentMethodLabel,
      paymentRef: p.payment_reference || "",
      status: p.status || "draft",
      paidAt: formatDate(p.paid_at),
      approvedAt: formatDate(p.approved_at),
    }));
  }, [filteredPeriods, paymentMethodLabel]);

  const lineItemRows = useMemo(() => {
    if (!recentLineItems?.length) return [];
    return recentLineItems.map((li) => ({
      id: li.id,
      displayId: getTransactionDisplayId(li.id),
      orderId: li.order_items?.order_id,
      product: li.order_items?.products?.name || "—",
      gross: Number(li.gross_amount || 0),
      commission: Number(li.commission_amount || 0),
      vendorNet: Number(li.vendor_net || 0),
      date: formatDate(li.created_at),
    }));
  }, [recentLineItems]);

  const metrics = useMemo(() => {
    const totalCompleted = payoutPeriods
      .filter((p) => p.status === "completed")
      .reduce((s, p) => s + Number(p.total_vendor_net || 0), 0);
    const totalPending = payoutPeriods
      .filter((p) => ["draft", "approved"].includes(p.status))
      .reduce((s, p) => s + Number(p.total_vendor_net || 0), 0);
    const nextApproved = payoutPeriods
      .filter((p) => p.status === "approved")
      .sort((a, b) => new Date(a.week_start) - new Date(b.week_start))[0];

    return {
      totalCompleted,
      totalPending,
      nextPayoutDate: nextApproved ? formatWeekPeriod(nextApproved.week_start) : "—",
    };
  }, [payoutPeriods]);

  const totalLineGross = lineItemRows.reduce((s, r) => s + r.gross, 0);
  const totalLineCommission = lineItemRows.reduce((s, r) => s + r.commission, 0);
  const totalLineNet = lineItemRows.reduce((s, r) => s + r.vendorNet, 0);

  const handleExport = () => {
    const csvContent = [
      ["Payout ID", "Period", "Gross (GHS)", "Commission (GHS)", "Vendor Net (GHS)", "Items", "Orders", "Payment Method", "Status"],
      ...payoutRows.map((row) => [
        row.displayId,
        row.period,
        row.totalGross.toFixed(2),
        row.totalCommission.toFixed(2),
        row.totalVendorNet.toFixed(2),
        row.totalItems,
        row.totalOrders,
        row.paymentMethod,
        row.status,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Vendor payouts management" className="flex flex-col space-y-6 w-full mb-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/v"
          className="text-[#6B7280] hover:text-[#111827] focus:text-[#111827]"
        >
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Payouts</span>
      </nav>

      {error && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-xs text-[#6B7280]">Refreshing payouts data...</div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PiCurrencyCircleDollar}
          iconColor="text-[#10B981]"
          title="Total Paid"
          value={formatCurrency(metrics.totalCompleted)}
          subtitle="Completed payouts"
        />

        <StatCard
          icon={PiClock}
          iconColor="text-[#F59E0B]"
          title="Pending Payouts"
          value={formatCurrency(metrics.totalPending)}
          subtitle="Draft & approved"
        />

        <StatCard
          icon={PiCalendar}
          iconColor="text-[#3B82F6]"
          title="Next Payout"
          value={metrics.nextPayoutDate}
          subtitle="Approved period"
        />

        <StatCard
          icon={PiPercent}
          iconColor="text-[#6B7280]"
          title="Commission Rate"
          value={`${commissionRate}%`}
          subtitle="Platform fee"
        />
      </div>

      {/* Payment Information Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[#111827] text-base font-semibold font-brasley-medium">
            Payment Information
          </h2>
          {hasPaymentInfo && (
            <button
              type="button"
              onClick={() => setShowPaymentDetails((v) => !v)}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              aria-label={showPaymentDetails ? "Hide payment details" : "Show payment details"}
            >
              {showPaymentDetails ? (
                <><PiEyeSlash className="w-4 h-4" /> Hide</>
              ) : (
                <><PiEye className="w-4 h-4" /> Show</>
              )}
            </button>
          )}
        </div>
        <p className="text-[#6B7280] text-sm mb-4">
          Your registered payment method
        </p>

        {!hasPaymentInfo ? (
          <div className="flex items-center gap-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-3">
            <PiWarning className="w-5 h-5 text-[#DC2626]" />
            <div>
              <p className="text-sm font-medium text-[#991B1B]">No payment details registered</p>
              <p className="text-xs text-[#991B1B]">You must register bank or MoMo details to be eligible for payouts.</p>
            </div>
            <Link
              href="/dashboard/v/profile"
              className="ml-auto px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Now
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#F3F4F6] rounded-lg">
                <PiBank className="w-5 h-5 text-[#374151]" />
              </div>
              <div>
                <p className="text-[#111827] text-sm font-medium">
                  {paymentMethodLabel}
                </p>
                <p className="text-[#6B7280] text-xs">
                  {showPaymentDetails
                    ? (paymentInfo?.bank_account || paymentInfo?.momo_number || "—")
                    : `Account ending in ••••${buildMaskedEnding(paymentInfo?.bank_account || paymentInfo?.momo_number)}`}
                </p>
                <p className="text-[#6B7280] text-xs">
                  {paymentInfo?.bank_name || paymentInfo?.momo_network || "Not set"}
                  {paymentInfo?.routing_number
                    ? showPaymentDetails
                      ? ` • Routing: ${paymentInfo.routing_number}`
                      : ` • Routing: ••••${buildMaskedEnding(paymentInfo.routing_number)}`
                    : ""}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/v/profile"
              className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              Update
            </Link>
          </div>
        )}
      </div>

      {/* Payout History Section */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-[#111827] text-lg font-semibold font-brasley-medium">
              Payout History
            </h2>
            <p className="text-[#6B7280] text-sm font-brasley-medium">
              Track your weekly payout periods.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              <PiCaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 text-[#374151] text-sm font-medium border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <PiExport className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Payout History Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Period
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Gross
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Your Net
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {payoutRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-[#6B7280]"
                  >
                    No payouts recorded yet.
                  </td>
                </tr>
              ) : (
                payoutRows.map((payout) => (
                  <tr key={payout.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
                      <span className="text-[#111827] text-sm font-medium">
                        {payout.period}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#111827] text-sm">
                        {formatCurrency(payout.totalGross)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#DC2626] text-sm">
                        -{formatCurrency(Math.abs(payout.totalCommission))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#10B981] text-sm font-semibold">
                        {formatCurrency(payout.totalVendorNet)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[#111827] text-sm">
                        {payout.totalItems}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[#111827] text-sm">
                        {payout.totalOrders}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={payout.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Line Items Section */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h2 className="text-[#111827] text-lg font-semibold font-brasley-medium">
              Recent Payout Line Items
            </h2>
            <p className="text-[#6B7280] text-sm font-brasley-medium">
              Detailed breakdown of items in your payouts
            </p>
          </div>
          <Link
            href="/dashboard/v/orders"
            className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
          >
            View All Orders →
          </Link>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Item ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Gross
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Your Net
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {lineItemRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-[#6B7280]"
                  >
                    No payout line items yet.
                  </td>
                </tr>
              ) : (
                lineItemRows.map((li) => (
                  <tr key={li.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
                      <span className="text-[#111827] text-sm font-medium">
                        {li.displayId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#111827] text-sm">
                        {li.product}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#111827] text-sm">
                        {formatCurrency(li.gross)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#DC2626] text-sm">
                        -{formatCurrency(Math.abs(li.commission))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#10B981] text-sm font-medium">
                        {formatCurrency(li.vendorNet)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#6B7280] text-sm">{li.date}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Line Items Summary Footer */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="flex flex-wrap items-center justify-between">
            <div>
              <span className="text-[#6B7280] text-sm">Total Gross</span>
              <p className="text-[#111827] text-lg font-semibold">
                {formatCurrency(totalLineGross)}
              </p>
            </div>
            <div>
              <span className="text-[#6B7280] text-sm">Total Commission</span>
              <p className="text-[#DC2626] text-lg font-semibold">
                -{formatCurrency(Math.abs(totalLineCommission))}
              </p>
            </div>
            <div>
              <span className="text-[#6B7280] text-sm">Net Earnings</span>
              <p className="text-[#10B981] text-lg font-semibold">
                {formatCurrency(totalLineNet)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Schedule Info Card */}
      <div className="bg-[#FFFBEB] rounded-xl border border-[#FDE68A] p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#FEF3C7] rounded-lg">
            <PiInfo className="w-5 h-5 text-[#D97706]" />
          </div>
          <div>
            <h3 className="text-[#111827] text-base font-semibold mb-2">
              Payout Rules
            </h3>
            <p className="text-[#6B7280] text-sm mb-3">
              Payouts are calculated weekly. Orders must be delivered for at
              least 5 days before they are eligible. Amounts are auto-calculated
              by the system — no manual entry.
            </p>
            <ul className="space-y-1.5 text-[#6B7280] text-sm">
              <li className="flex items-center gap-2">
                <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
                Minimum payout: GHS 100
              </li>
              <li className="flex items-center gap-2">
                <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
                5-day hold after delivery confirmation
              </li>
              <li className="flex items-center gap-2">
                <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
                Commission on product base price (excl. service charge)
              </li>
              <li className="flex items-center gap-2">
                <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
                Service charges are retained by Giftologi
              </li>
              <li className="flex items-center gap-2">
                <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
                Payment details (bank or MoMo) required for eligibility
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

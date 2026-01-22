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
  PiInfo,
  PiCheckCircle,
} from "react-icons/pi";
import { useVendorPayoutsContext } from "./context";

const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "GHS0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS0.00";
  return `GHS${num.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().split("T")[0];
};

const buildMaskedEnding = (value) => {
  if (!value) return "";
  const safe = String(value);
  return safe.slice(-4);
};

const getPayoutDisplayId = (id) => {
  if (!id) return "—";
  const trimmed = String(id).replace(/-/g, "");
  return `PAY-${trimmed.slice(-6).toUpperCase()}`;
};

const getTransactionDisplayId = (id) => {
  if (!id) return "—";
  const trimmed = String(id).replace(/-/g, "");
  return `TXN-${trimmed.slice(-6).toUpperCase()}`;
};

const getStatusConfig = (status) => {
  const s = (status || "").toLowerCase();
  const configs = {
    pending: {
      label: "Pending",
      className: "bg-[#FEF3C7] text-[#D97706]",
      dotColor: "bg-[#F59E0B]",
    },
    completed: {
      label: "Completed",
      className: "bg-[#D1FAE5] text-[#059669]",
      dotColor: "bg-[#10B981]",
    },
    processing: {
      label: "Processing",
      className: "bg-[#DBEAFE] text-[#2563EB]",
      dotColor: "bg-[#3B82F6]",
    },
    failed: {
      label: "Failed",
      className: "bg-[#FEE2E2] text-[#DC2626]",
      dotColor: "bg-[#EF4444]",
    },
  };
  return configs[s] || { label: status || "Unknown", className: "bg-[#F3F4F6] text-[#6B7280]", dotColor: "bg-[#9CA3AF]" };
};

function StatCard({ icon: Icon, iconBgColor, title, value, subtitle, indicator }) {
  return (
    <div className="flex flex-col space-y-2 p-4 bg-white rounded-xl border border-[#E5E7EB]">
      <div className="flex items-center justify-between">
        <span className="text-[#6B7280] text-sm font-poppins">{title}</span>
        {indicator && (
          <div className={`w-2 h-2 rounded-full ${indicator}`} />
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[#111827] text-2xl font-semibold font-inter">
            {value}
          </span>
          {subtitle && (
            <span className="text-[#6B7280] text-xs mt-0.5">{subtitle}</span>
          )}
        </div>
        <div className={`p-2 rounded-full ${iconBgColor}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}

export default function VendorPayoutsContent() {
  const [dateFilter, setDateFilter] = useState("last_30_days");
  const {
    payouts,
    paymentInfo,
    transactions,
    commissionRate: vendorCommissionRate,
    loading,
    error,
  } = useVendorPayoutsContext();

  const computed = useMemo(() => {
    const now = new Date();
    let startDate = new Date(now);

    if (dateFilter === "last_60_days") {
      startDate.setDate(now.getDate() - 60);
    } else if (dateFilter === "last_90_days") {
      startDate.setDate(now.getDate() - 90);
    } else if (dateFilter === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    const isWithinRange = (dateValue) => {
      if (!dateValue) return false;
      const date = new Date(dateValue);
      return Number.isFinite(date.getTime()) && date >= startDate;
    };

    const filteredPayouts = payouts.filter((payout) =>
      isWithinRange(payout.created_at || payout.to_date || payout.from_date),
    );
    const filteredTransactions = transactions.filter((txn) =>
      isWithinRange(txn.created_at),
    );

    const commissionRate = Number(vendorCommissionRate || 0);
    const commissionFactor = Number.isFinite(commissionRate) ? commissionRate / 100 : 0;

    const payoutRows = filteredPayouts.map((payout) => {
      const fromDate = formatDate(payout.from_date);
      const toDate = formatDate(payout.to_date);
      const period = payout.from_date || payout.to_date
        ? `${fromDate} - ${toDate}`
        : formatDate(payout.created_at);

      return {
        id: payout.id,
        displayId: getPayoutDisplayId(payout.id),
        period,
        orders: payout.total_orders ?? 0,
        amount: Number(payout.total_net_amount || 0),
        scheduledDate: formatDate(payout.created_at),
        status: payout.status || "pending",
      };
    });

    const transactionRows = filteredTransactions.map((txn) => {
      const quantity = Number(txn.quantity || 0);
      const price = Number(txn.price || 0);
      const saleAmount = Number.isFinite(quantity) && Number.isFinite(price)
        ? quantity * price
        : 0;
      const commission = saleAmount * commissionFactor;
      const netAmount = saleAmount - commission;
      const status = txn.vendor_payouts?.status || txn.vendor_status || txn.fulfillment_status;

      return {
        id: txn.id,
        displayId: getTransactionDisplayId(txn.id),
        orderId: txn.order_id,
        product: txn.products?.name || "—",
        saleAmount,
        commission,
        netAmount,
        date: formatDate(txn.created_at),
        status: status || "pending",
      };
    });

    const totalEarnings = payoutRows.reduce((sum, row) => sum + row.amount, 0);
    const pendingPayouts = payoutRows
      .filter((row) => ["pending", "processing"].includes(String(row.status || "").toLowerCase()))
      .reduce((sum, row) => sum + row.amount, 0);

    const nextPending = payoutRows
      .filter((row) => String(row.status || "").toLowerCase() === "pending")
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];

    const totalSales = transactionRows.reduce((sum, row) => sum + row.saleAmount, 0);
    const totalCommission = transactionRows.reduce((sum, row) => sum + row.commission, 0);
    const netEarnings = transactionRows.reduce((sum, row) => sum + row.netAmount, 0);

    const paymentMethod = paymentInfo?.bank_name || paymentInfo?.bank_account
      ? "Bank Transfer"
      : paymentInfo?.momo_number
      ? `MoMo${paymentInfo?.momo_network ? ` (${paymentInfo.momo_network})` : ""}`
      : "Not set";

    return {
      commissionRate: Number.isFinite(commissionRate) ? commissionRate : 0,
      paymentMethod,
      payoutRows,
      transactionRows,
      totalEarnings,
      pendingPayouts,
      nextPayoutDate: nextPending?.scheduledDate || "—",
      totalSales,
      totalCommission,
      netEarnings,
    };
  }, [dateFilter, payouts, paymentInfo, transactions, vendorCommissionRate]);

  const {
    commissionRate,
    paymentMethod,
    payoutRows,
    transactionRows,
    totalEarnings,
    pendingPayouts,
    nextPayoutDate,
    totalSales,
    totalCommission,
    netEarnings,
  } = computed;

  const handleExport = () => {
    const csvContent = [
      ["Payout ID", "Period", "Orders", "Amount", "Scheduled Date", "Payment Method", "Status"],
      ...payoutRows.map((payout) => [
        payout.displayId,
        payout.period,
        payout.orders,
        payout.amount,
        payout.scheduledDate,
        paymentMethod,
        payout.status,
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
    <div className="flex flex-col space-y-6 w-full mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/v" className="text-[#6B7280] hover:text-[#111827]">
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Payouts</span>
      </div>

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
          iconBgColor="bg-[#10B981]"
          title="Total Earnings"
          value={formatCurrency(totalEarnings)}
          subtitle="Selected period"
        />

        <StatCard
          icon={PiClock}
          iconBgColor="bg-[#F59E0B]"
          title="Pending Payouts"
          value={formatCurrency(pendingPayouts)}
          subtitle="Awaiting transfer"
          indicator="bg-[#F59E0B]"
        />

        <StatCard
          icon={PiCalendar}
          iconBgColor="bg-[#3B82F6]"
          title="Next Payout"
          value={nextPayoutDate}
          subtitle="Scheduled date"
        />

        <StatCard
          icon={PiPercent}
          iconBgColor="bg-[#6B7280]"
          title="Commission Rate"
          value={`${commissionRate}%`}
          subtitle="Platform fee"
        />
      </div>

      {/* Payment Information Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <h2 className="text-[#111827] text-base font-semibold font-inter mb-1">
          Payment Information
        </h2>
        <p className="text-[#6B7280] text-sm mb-4">Your registered payment method</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F3F4F6] rounded-lg">
              <PiBank className="w-5 h-5 text-[#374151]" />
            </div>
            <div>
              <p className="text-[#111827] text-sm font-medium">{paymentMethod}</p>
              <p className="text-[#6B7280] text-xs">
                Account ending in ***{buildMaskedEnding(paymentInfo?.bank_account || paymentInfo?.momo_number)}
              </p>
              <p className="text-[#6B7280] text-xs">
                {paymentInfo?.bank_name || paymentInfo?.momo_network || "Not set"}
                {paymentInfo?.routing_number
                  ? ` • Routing ***${buildMaskedEnding(paymentInfo.routing_number)}`
                  : ""}
              </p>
            </div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors">
            Update Payment Method
          </button>
        </div>
      </div>

      {/* Payout History Section */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-[#111827] text-lg font-semibold font-inter">
              Payout History
            </h2>
            <p className="text-[#6B7280] text-sm font-poppins">
              Track your scheduled and completed payouts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="last_30_days">Last 30 days</option>
                <option value="last_60_days">Last 60 days</option>
                <option value="last_90_days">Last 90 days</option>
                <option value="this_year">This year</option>
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
                  Payout ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Period
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {payoutRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
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
                        {payout.displayId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#6B7280] text-sm">{payout.period}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[#111827] text-sm">{payout.orders}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#10B981] text-sm font-semibold">
                        {formatCurrency(payout.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#6B7280] text-sm">{payout.scheduledDate}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PiBank className="w-4 h-4 text-[#6B7280]" />
                        <span className="text-[#6B7280] text-sm">{paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={payout.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
                        title="View Details"
                      >
                        <PiEye className="w-5 h-5 text-[#6B7280]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h2 className="text-[#111827] text-lg font-semibold font-inter">
              Recent Transactions
            </h2>
            <p className="text-[#6B7280] text-sm font-poppins">
              Detailed breakdown of your sales
            </p>
          </div>
          <Link
            href="/dashboard/v/orders"
            className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
          >
            View All →
          </Link>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Sale Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Net Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {transactionRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-[#6B7280]"
                  >
                    No recent transactions yet.
                  </td>
                </tr>
              ) : (
                transactionRows.map((txn) => (
                  <tr key={txn.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
                      <span className="text-[#111827] text-sm font-medium">
                        {txn.displayId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/v/orders?id=${txn.orderId}`}
                        className="text-primary text-sm hover:underline"
                      >
                        {txn.orderId ? `ORD-${String(txn.orderId).slice(-4)}` : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#111827] text-sm">{txn.product}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#111827] text-sm">
                        {formatCurrency(txn.saleAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#DC2626] text-sm">
                        -{formatCurrency(Math.abs(txn.commission))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#10B981] text-sm font-medium">
                        {formatCurrency(txn.netAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#6B7280] text-sm">{txn.date}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={txn.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Transactions Summary Footer */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <span className="text-[#6B7280] text-sm">Total Sales</span>
              <p className="text-[#111827] text-lg font-semibold">
                {formatCurrency(totalSales)}
              </p>
            </div>
            <div>
              <span className="text-[#6B7280] text-sm">Total Commission</span>
              <p className="text-[#DC2626] text-lg font-semibold">
                -{formatCurrency(Math.abs(totalCommission))}
              </p>
            </div>
            <div>
              <span className="text-[#6B7280] text-sm">Net Earnings</span>
              <p className="text-[#10B981] text-lg font-semibold">
                {formatCurrency(netEarnings)}
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
              Payout Schedule
            </h3>
            <p className="text-[#6B7280] text-sm mb-3">
              Payouts are processed bi-monthly on the 15th and last day of each month. 
              Orders must be delivered and confirmed before being included in a payout batch.
            </p>
            <ul className="space-y-1.5 text-[#6B7280] text-sm">
              <li className="flex items-center gap-2">
                <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
                Minimum payout amount: GHS50
              </li>
              <li className="flex items-center gap-2">
                <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
                Processing time: 3-5 business days
              </li>
              <li className="flex items-center gap-2">
                <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
                Platform commission: 15% per transaction
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
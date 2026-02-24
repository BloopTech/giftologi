"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  PiClock,
  PiTruck,
  PiPackage,
  PiMagnifyingGlass,
  PiExport,
  PiEye,
  PiPrinter,
  PiUser,
  PiEnvelope,
  PiPhone,
  PiMapPin,
  PiInfo,
  PiCheckCircle,
} from "react-icons/pi";

import { useVendorOrdersContext } from "./context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "../../../components/Dialog";
import {
  formatCurrency,
  formatDate,
  StatCard,
  StatusBadge,
} from "./utils";

function formatVariationLabel(variation) {
  if (!variation) return "Standard";

  if (typeof variation === "string") {
    const trimmed = variation.trim();
    return trimmed || "Standard";
  }

  if (typeof variation === "object") {
    if (variation.label) return String(variation.label);
    if (variation.name) return String(variation.name);

    const skipKeys = new Set(["id", "key", "sku", "stock_qty", "price", "label", "name"]);
    const parts = Object.entries(variation)
      .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== "")
      .map(([key, value]) => `${key}: ${value}`);

    if (parts.length) return parts.join(", ");
  }

  return "Standard";
}


function OrderDetailsDialog({ open, onOpenChange, order }) {
  const [activeTab, setActiveTab] = useState("product");

  useEffect(() => {
    if (open) {
      setActiveTab("product");
    }
  }, [open, order?.id]);

  if (!order) return null;

  const customerName = order.customer
    ? `${order.customer.firstname || ""} ${order.customer.lastname || ""}`.trim() ||
      "Unknown Customer"
    : "Unknown Customer";

  const registryOwnerName = order.registryOwner
    ? `${order.registryOwner.firstname || ""} ${order.registryOwner.lastname || ""}`.trim()
    : null;

  const giftWrapFee = Number(order.giftWrapOption?.fee || 0);
  const giftWrapLabel = order.giftWrapOption?.name
    ? `${order.giftWrapOption.name}${
        Number.isFinite(giftWrapFee) && giftWrapFee > 0
          ? ` (${formatCurrency(giftWrapFee)})`
          : ""
      }`
    : order.wrapping
    ? "Gift wrap selected"
    : "No gift wrap";

  const shipping = order.shipping || {};
  const hasShippingDetails =
    !!shipping.address ||
    !!shipping.city ||
    !!shipping.region ||
    !!shipping.digitalAddress;
  const variationLabel = formatVariationLabel(order.variation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-[#111827] text-lg font-semibold">
                Order Details - {order.orderCode}
              </DialogTitle>
              <StatusBadge status={order.status} />
            </div>
          </div>
          <DialogDescription className="text-[#6B7280] text-sm">
            Order placed on {formatDate(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3 print:hidden">
            <button
              type="button"
              onClick={() => setActiveTab("product")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === "product"
                  ? "bg-[#111827] text-white"
                  : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
              }`}
            >
              Product
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("buyer")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === "buyer"
                  ? "bg-[#111827] text-white"
                  : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
              }`}
            >
              Buyer & Delivery
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("fulfillment")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === "fulfillment"
                  ? "bg-[#111827] text-white"
                  : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
              }`}
            >
              Fulfillment
            </button>
          </div>

          {/* Product Information */}
          <div className={`space-y-3 ${activeTab === "product" ? "block" : "hidden"} print:block`}>
            <h3 className="text-[#111827] text-sm font-semibold flex items-center gap-2">
              <PiPackage className="w-4 h-4" />
              Product Information
            </h3>
            <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-[#6B7280] text-sm">Product Name:</span>
                <span className="text-[#111827] text-sm font-medium">
                  {order.product?.name || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] text-sm">SKU:</span>
                <span className="text-[#111827] text-sm">
                  {order.product?.product_code || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] text-sm">Variation:</span>
                <span className="text-[#111827] text-sm text-right max-w-[60%]">
                  {variationLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] text-sm">Quantity:</span>
                <span className="text-[#111827] text-sm">{order.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] text-sm">Unit Price:</span>
                <span className="text-[#111827] text-sm">
                  {formatCurrency(order.price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] text-sm">Gift wrap:</span>
                <span className="text-[#111827] text-sm">{giftWrapLabel}</span>
              </div>
              {order.checkoutContext && (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] text-sm">Total Weight:</span>
                    <span className="text-[#111827] text-sm">
                      {Number.isFinite(Number(order.checkoutContext.total_weight_kg))
                        ? `${Number(order.checkoutContext.total_weight_kg).toFixed(2)} kg`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] text-sm">Pieces:</span>
                    <span className="text-[#111827] text-sm">
                      {Number.isFinite(Number(order.checkoutContext.pieces))
                        ? `${order.checkoutContext.pieces} piece${order.checkoutContext.pieces === 1 ? "" : "s"}`
                        : "—"}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#6B7280] text-sm font-medium">
                  Total Amount:
                </span>
                <span className="text-[#111827] text-sm font-semibold">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className={`space-y-3 ${activeTab === "buyer" ? "block" : "hidden"} print:block`}>
            <h3 className="text-[#111827] text-sm font-semibold flex items-center gap-2">
              <PiUser className="w-4 h-4" />
              Customer Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <PiUser className="w-4 h-4 text-[#6B7280]" />
                <span className="text-[#111827]">{customerName}</span>
              </div>
              {order.customer?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <PiEnvelope className="w-4 h-4 text-[#6B7280]" />
                  <span className="text-[#111827]">{order.customer.email}</span>
                </div>
              )}
              {order.customer?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <PiPhone className="w-4 h-4 text-[#6B7280]" />
                  <span className="text-[#111827]">{order.customer.phone}</span>
                </div>
              )}
            </div>

            {/* Registry Info */}
            {order.registry && (
              <div className="mt-3 pt-3 border-t border-[#E5E7EB] space-y-2">
                <div className="text-sm">
                  <span className="text-[#6B7280]">Registry:</span>
                  <p className="text-[#111827] font-medium">
                    {order.registry.title || "—"}
                  </p>
                </div>
                {registryOwnerName && (
                  <div className="text-sm">
                    <span className="text-[#6B7280]">Gift Giver:</span>
                    <p className="text-[#111827] font-medium">
                      {registryOwnerName}
                    </p>
                    {order.registryOwner?.email && (
                      <p className="text-[#6B7280] text-xs">
                        {order.registryOwner.email}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className={`space-y-3 ${activeTab === "buyer" ? "block" : "hidden"} print:block`}>
            <h3 className="text-[#111827] text-sm font-semibold flex items-center gap-2">
              <PiMapPin className="w-4 h-4" />
              Shipping Address
            </h3>
            {hasShippingDetails ? (
              <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-2">
                {shipping.address && (
                  <p className="text-[#111827] text-sm">{shipping.address}</p>
                )}
                {(shipping.city || shipping.region) && (
                  <p className="text-[#4B5563] text-sm">
                    {[shipping.city, shipping.region].filter(Boolean).join(", ")}
                  </p>
                )}
                {shipping.digitalAddress && (
                  <p className="text-[#4B5563] text-sm">
                    Digital address: {shipping.digitalAddress}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-[#F9FAFB] rounded-lg p-4">
                <p className="text-[#6B7280] text-sm">
                  Shipping details are not available for this order.
                </p>
              </div>
            )}
          </div>

          {/* Fulfillment ownership note */}
          <div className={`space-y-3 ${activeTab === "fulfillment" ? "block" : "hidden"} print:block`}>
            <h3 className="text-[#111827] text-sm font-semibold">
              Fulfillment Status
            </h3>
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 flex items-start gap-2">
              <PiInfo className="w-4 h-4 mt-0.5 text-[#6B7280]" />
              <p className="text-[#4B5563] text-xs leading-relaxed">
                Giftologi Operations manages order fulfillment and delivery updates.
                You can monitor this order here, but status changes are handled by
                the admin operations team.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t border-[#E5E7EB] print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB]"
          >
            <PiPrinter className="w-4 h-4" />
            Print Order
          </button>
          <DialogClose asChild>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB]"
            >
              Close
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorOrdersContent() {
  const { orders, stats, loading, error } = useVendorOrdersContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchQuery ||
      order.orderCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${order.customer?.firstname || ""} ${order.customer?.lastname || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      order.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleExport = async () => {
    if (exporting) return;

    setExporting(true);

    try {
      const response = await fetch("/api/vendor/orders/exports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: statusFilter,
          q: searchQuery,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "Failed to queue export");
      }

      toast.success(
        result?.deduped
          ? "A matching export is already queued."
          : result?.message ||
              "Export queued. You will receive a download email shortly.",
      );
    } catch (error) {
      toast.error(error?.message || "Failed to queue export");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col space-y-4 w-full mb-8">
        <div className="h-8 w-48 rounded-lg bg-[#E5E7EB] animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-[#E5E7EB] animate-pulse"
            />
          ))}
        </div>
        <div className="h-96 w-full rounded-xl bg-[#E5E7EB] animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col space-y-2 w-full mb-8">
        <h1 className="text-[#111827] font-semibold font-brasley-medium">Orders</h1>
        <p className="text-[#6B7280] text-sm font-brasley-medium">{error}</p>
      </div>
    );
  }

  return (
    <section aria-label="Vendor orders management" className="flex flex-col space-y-6 w-full mb-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/v"
          className="text-[#6B7280] hover:text-[#111827] focus:text-[#111827]"
        >
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Orders</span>
      </nav>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PiClock}
          iconColor="text-[#F59E0B]"
          title="Pending Orders"
          value={stats.pending}
          indicator="bg-[#F59E0B]"
        />
        <StatCard
          icon={PiPackage}
          iconColor="text-[#6366F1]"
          title="Paid"
          value={stats.paid}
        />
        <StatCard
          icon={PiTruck}
          iconColor="text-[#9810FA]"
          title="Shipped"
          value={stats.shipped}
        />
        <StatCard
          icon={PiCheckCircle}
          iconColor="text-[#10B981]"
          title="Delivered"
          value={stats.delivered}
        />
      </div>

      {/* Order Management Section */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-[#111827] text-lg font-semibold font-brasley-medium">
              Order Management
            </h2>
            <p className="text-[#6B7280] text-sm font-brasley-medium">
              Track and manage all your product orders.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[#374151] text-sm font-medium border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PiExport className="w-4 h-4" />
            {exporting ? "Queueing export..." : "Export"}
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search by order code, product, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="relative">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status ({orders.length})</SelectItem>
                <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
                <SelectItem value="paid">Paid ({stats.paid})</SelectItem>
                <SelectItem value="shipped">Shipped ({stats.shipped})</SelectItem>
                <SelectItem value="delivered">Delivered ({stats.delivered})</SelectItem>
                <SelectItem value="cancelled">Cancelled ({stats.cancelled})</SelectItem>
                <SelectItem value="expired">Expired ({stats.expired})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Order Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Registry
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Date
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <PiPackage className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] text-sm">
                        {searchQuery || statusFilter !== "all"
                          ? "No orders match your filters"
                          : "No orders yet"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const customerName = order.customer
                    ? `${order.customer.firstname || ""} ${order.customer.lastname || ""}`.trim() ||
                      "—"
                    : "—";

                  return (
                    <tr key={order.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3">
                        <span className="text-[#111827] text-sm font-medium">
                          {order.orderCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-[#111827] text-sm font-medium">
                            {order.product?.name || "—"}
                          </span>
                          <span className="text-[#6B7280] text-xs">
                            SKU: {order.product?.product_code || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-[#111827] text-sm">
                            {customerName}
                          </span>
                          {order.customer?.email && (
                            <span className="text-[#6B7280] text-xs">
                              {order.customer.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#111827] text-sm">
                          {order.registry?.title || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[#111827] text-sm">
                          {order.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[#111827] text-sm font-medium">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#6B7280] text-sm">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
                            title="View Details"
                          >
                            <PiEye className="w-5 h-5 text-[#6B7280]" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setDialogOpen(true);
                              setTimeout(() => {
                                window.print();
                              }, 0);
                            }}
                            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
                            title="Print"
                          >
                            <PiPrinter className="w-5 h-5 text-[#6B7280]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={selectedOrder}
      />
    </section>
  );
}

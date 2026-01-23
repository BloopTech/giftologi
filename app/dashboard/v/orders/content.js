"use client";
import React, { useState, useEffect, useActionState, useRef } from "react";
import Link from "next/link";

import {
  PiClock,
  PiCheckCircle,
  PiTruck,
  PiPackage,
  PiMagnifyingGlass,
  PiCaretDown,
  PiExport,
  PiEye,
  PiPrinter,
  PiUser,
  PiEnvelope,
  PiPhone,
  PiMapPin,
  PiSpinner,
} from "react-icons/pi";

import { useVendorOrdersContext } from "./context";
import { manageOrders } from "./action";
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
  formatShortDate,
  StatCard,
  StatusBadge,
  getStatusConfig,
} from "./utils";


function OrderDetailsDialog({ open, onOpenChange, order, onStatusUpdate }) {
  const [state, formAction, isPending] = useActionState(manageOrders, {
    success: false,
    message: "",
    errors: {},
    values: {},
  });
  const formRef = useRef(null);

  const [selectedStatus, setSelectedStatus] = useState(
    order?.status || "pending",
  );

  useEffect(() => {
    if (order?.status) {
      setSelectedStatus(order.status);
    }
  }, [order?.status]);

  useEffect(() => {
    if (state.success) {
      onStatusUpdate?.(order?.id, state.newStatus);
    }
  }, [state.success, state.newStatus, order?.id, onStatusUpdate]);

  if (!order) return null;

  const customerName = order.customer
    ? `${order.customer.firstname || ""} ${order.customer.lastname || ""}`.trim() ||
      "Unknown Customer"
    : "Unknown Customer";

  const registryOwnerName = order.registryOwner
    ? `${order.registryOwner.firstname || ""} ${order.registryOwner.lastname || ""}`.trim()
    : null;

  const statusOptions = [
    { value: "pending", label: "Pending", icon: PiClock },
    { value: "confirmed", label: "Confirmed", icon: PiCheckCircle },
    { value: "processing", label: "Processing", icon: PiSpinner },
    { value: "shipped", label: "Shipped", icon: PiTruck },
    { value: "delivered", label: "Delivered", icon: PiPackage },
  ];

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
          {/* Product Information */}
          <div className="space-y-3">
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
                <span className="text-[#6B7280] text-sm">Quantity:</span>
                <span className="text-[#111827] text-sm">{order.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] text-sm">Unit Price:</span>
                <span className="text-[#111827] text-sm">
                  {formatCurrency(order.price)}
                </span>
              </div>
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
          <div className="space-y-3">
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
          <div className="space-y-3">
            <h3 className="text-[#111827] text-sm font-semibold flex items-center gap-2">
              <PiMapPin className="w-4 h-4" />
              Shipping Address
            </h3>
            <div className="bg-[#F9FAFB] rounded-lg p-4">
              <p className="text-[#6B7280] text-sm">
                Shipping details are not available for this order.
              </p>
            </div>
          </div>

          {/* Update Order Status */}
          <div className="space-y-3">
            <h3 className="text-[#111827] text-sm font-semibold">
              Update Order Status
            </h3>
            <form ref={formRef} action={formAction}>
              <input type="hidden" name="action" value="update_status" />
              <input type="hidden" name="orderItemId" value={order.id} />
              <input type="hidden" name="status" value={selectedStatus} />

              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedStatus === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedStatus(option.value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        isSelected
                          ? "bg-[#111827] text-white border-[#111827]"
                          : "bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F3F4F6]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {state.message && !state.success && (
                <p className="mt-2 text-red-600 text-xs">{state.message}</p>
              )}
              {state.message && state.success && (
                <p className="mt-2 text-green-600 text-xs">{state.message}</p>
              )}
            </form>
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t border-[#E5E7EB]">
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
          <button
            type="button"
            disabled={isPending || selectedStatus === order.status}
            onClick={() => formRef.current?.requestSubmit()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Updating..." : "Save Changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorOrdersContent() {
  const { orders, stats, loading, error, refreshData } =
    useVendorOrdersContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleStatusUpdate = (orderId, newStatus) => {
    refreshData();
  };

  const handleExport = () => {
    const csvContent = [
      [
        "Order ID",
        "Product",
        "SKU",
        "Customer",
        "Registry",
        "Quantity",
        "Amount",
        "Date",
        "Status",
      ],
      ...filteredOrders.map((order) => [
        order.orderCode,
        order.product?.name || "",
        order.product?.product_code || "",
        `${order.customer?.firstname || ""} ${order.customer?.lastname || ""}`.trim(),
        order.registry?.title || "",
        order.quantity,
        order.totalAmount,
        formatShortDate(order.createdAt),
        order.status,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <h1 className="text-[#111827] font-semibold font-inter">Orders</h1>
        <p className="text-[#6B7280] text-sm font-poppins">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 w-full mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/v"
          className="text-[#6B7280] hover:text-[#111827]"
        >
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Orders</span>
      </div>

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
          title="In Progress"
          value={stats.confirmed + stats.processing}
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
            <h2 className="text-[#111827] text-lg font-semibold font-inter">
              Order Management
            </h2>
            <p className="text-[#6B7280] text-sm font-poppins">
              Track and manage all your product orders.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[#374151] text-sm font-medium border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            <PiExport className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search by order ID, product, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Status ({orders.length})</option>
              <option value="pending">Pending ({stats.pending})</option>
              <option value="confirmed">Confirmed ({stats.confirmed})</option>
              <option value="processing">
                Processing ({stats.processing})
              </option>
              <option value="shipped">Shipped ({stats.shipped})</option>
              <option value="delivered">Delivered ({stats.delivered})</option>
              <option value="cancelled">Cancelled ({stats.cancelled})</option>
            </select>
            <PiCaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Order ID
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
                              window.print();
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
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}

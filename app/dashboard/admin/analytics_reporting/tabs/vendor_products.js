"use client";
import React from "react";

function MetricCard({ title, value, description }) {
  return (
    <div className="flex flex-col space-y-2 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
      <h2 className="text-[#4A5565] text-xs/4 font-inter">{title}</h2>
      <div className="flex justify-between items-center font-inter text-[#101828]">
        {value}
      </div>
      <span className="font-inter text-[#6A7282] text-[10px]">
        {description}
      </span>
    </div>
  );
}

export default function AnalyticsReportVendorProducts(props) {
  const { metrics, isLoading, formatCount, formatCurrency } = props;

  const skeleton = (
    <div className="h-4 w-16 rounded bg-[#E5E7EB] animate-pulse" />
  );

  const renderCountValue = (key) => {
    if (isLoading) return skeleton;
    if (!metrics) {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">—</p>
      );
    }
    return (
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
        {formatCount(metrics[key])}
      </p>
    );
  };

  const topVendors = metrics?.topVendors || [];
  const topProducts = metrics?.topProducts || [];

  return (
    <div className="flex flex-col gap-4 w-full mt-2">
      {/* Top Performing Vendors table */}
      <div className="w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col mb-2 font-inter">
          <h2 className="text-[#0A0A0A] text-sm font-medium">
            Top Performing Vendors
          </h2>
          <p className="text-[#717182] text-[11px] mt-1">
            Based on completed sales volume.
          </p>
        </div>
        <div className="mt-[1rem] overflow-x-auto">
          <table className="min-w-full text-[11px] text-left font-inter">
            <thead>
              <tr className="text-[#0A0A0A] font-medium">
                <th className="pb-1 pr-4 font-medium">Vendor Name</th>
                <th className="pb-1 pr-4 font-medium text-right">
                  Total Sales (GHS)
                </th>
                <th className="pb-1 pr-4 font-medium text-right">Orders</th>
                <th className="pb-1 font-medium text-right">Growth</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-2 text-[#9CA3AF]">
                    <div className="h-4 w-32 rounded bg-[#E5E7EB] animate-pulse" />
                  </td>
                </tr>
              ) : !topVendors.length ? (
                <tr>
                  <td colSpan={4} className="py-2 text-[#9CA3AF]">
                    No vendor data for this period.
                  </td>
                </tr>
              ) : (
                topVendors.map((row) => {
                  const growthPct =
                    typeof row.growthRate === "number" &&
                    Number.isFinite(row.growthRate)
                      ? `${(row.growthRate * 100).toFixed(1)}%`
                      : "—";
                  return (
                    <tr key={row.vendorId} className="border-t border-[#F3F4F6]">
                      <td className="py-1 pr-4 text-[#111827]">
                        {row.vendorName || "Vendor"}
                      </td>
                      <td className="py-1 pr-4 text-right text-[#111827]">
                        {formatCurrency(row.totalSales || 0)}
                      </td>
                      <td className="py-1 pr-4 text-right text-[#111827]">
                        {formatCount(row.orders || 0)}
                      </td>
                      <td className="py-1 text-right text-[#16A34A]">
                        {growthPct}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Selling Products table */}
      <div className="w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col mb-2">
          <h2 className="text-[#0A0A0A] text-sm font-medium font-inter">
            Top Selling Products
          </h2>
          <p className="text-[#717182] text-[11px] mt-1">
            Highest number of purchases and page views.
          </p>
        </div>
        <div className="mt-[1rem] overflow-x-auto">
          <table className="min-w-full text-[11px] text-left font-inter">
            <thead>
              <tr className="text-[#0A0A0A] font-medium">
                <th className="pb-1 pr-3 font-medium">Product Name</th>
                <th className="pb-1 pr-2 font-medium">Vendor</th>
                <th className="pb-1 pr-2 font-medium text-right">Views</th>
                <th className="pb-1 pr-2 font-medium text-right">Purchases</th>
                <th className="pb-1 font-medium text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-2 text-[#9CA3AF]">
                    <div className="h-4 w-32 rounded bg-[#E5E7EB] animate-pulse" />
                  </td>
                </tr>
              ) : !topProducts.length ? (
                <tr>
                  <td colSpan={5} className="py-2 text-[#9CA3AF]">
                    No product view data for this period.
                  </td>
                </tr>
              ) : (
                topProducts.map((row) => {
                  const conversionPct =
                    typeof row.conversion === "number" &&
                    Number.isFinite(row.conversion)
                      ? `${(row.conversion * 100).toFixed(1)}%`
                      : "—";
                  return (
                    <tr key={row.productId} className="border-t border-[#F3F4F6]">
                      <td className="py-1 pr-3 text-[#111827] line-clamp-1">
                        {row.productName || "Product"}
                      </td>
                      <td className="py-1 pr-2 text-[#6B7280] line-clamp-1">
                        {row.vendorName || "—" }
                      </td>
                      <td className="py-1 pr-2 text-right text-[#111827]">
                        {formatCount(row.views || 0)}
                      </td>
                      <td className="py-1 pr-2 text-right text-[#111827]">
                        {formatCount(row.purchases || 0)}
                      </td>
                      <td className="py-1 text-right text-[#111827]">
                        {conversionPct}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        <MetricCard
          title="Product Approval Queue"
          value={renderCountValue("productApprovalQueue")}
          description="Pending vendor submissions"
        />
        <MetricCard
          title="Low Inventory Alerts"
          value={renderCountValue("lowInventoryCount")}
          description="Products nearing out-of-stock"
        />
        <MetricCard
          title="Inactive Vendors"
          value={renderCountValue("inactiveVendorsCount")}
          description="No sales in 30+ days"
        />
      </div>
    </div>
  );
}

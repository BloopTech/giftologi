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

export default function AnalyticsReportRegistryUser(props) {
  const { metrics, isLoading, renderMetricValue, formatCount } = props;

  const skeleton = (
    <div className="h-4 w-16 rounded bg-[#E5E7EB] animate-pulse" />
  );

  const popularTypes = metrics?.popularRegistryTypes || [];

  const renderRegistriesCreated = () => {
    if (isLoading) return skeleton;
    if (!metrics) {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">—</p>
      );
    }
    return (
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
        {formatCount(metrics.registriesCreated)}
      </p>
    );
  };

  const renderActiveCompleted = () => {
    if (isLoading) return skeleton;
    if (!metrics) {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">—</p>
      );
    }
    const active = formatCount(metrics.activeRegistries || 0);
    const completed = formatCount(metrics.completedRegistries || 0);
    return (
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
        {active} / {completed}
      </p>
    );
  };

  const renderAvgGifts = () => {
    if (isLoading) return skeleton;
    if (!metrics) {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">—</p>
      );
    }
    return renderMetricValue("avgGifts", metrics);
  };

  const renderPercentage = (raw) => {
    if (isLoading) return skeleton;
    if (!metrics || raw === null || typeof raw === "undefined") {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">—</p>
      );
    }
    const num = Number(raw);
    const label =
      Number.isFinite(num) && num >= 0 ? `${(num * 100).toFixed(1)}%` : "—";
    return (
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">{label}</p>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        <MetricCard
          title="Registries Created"
          value={renderRegistriesCreated()}
          description="Total number created by hosts"
        />
        <MetricCard
          title="Active vs. Completed"
          value={renderActiveCompleted()}
          description="Lifecycle stats"
        />
        <MetricCard
          title="Avg Gifts per Registry"
          value={renderAvgGifts()}
          description="Engagement gauge"
        />
      </div>

      <div className="w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <h2 className="text-[#0A0A0A] font-medium text-sm font-inter">
              Most Popular Registry Types
            </h2>
            <p className="text-xs text-[#717182] font-inter mt-1">
              Distribution by event category.
            </p>
          </div>
        </div>
        <div className="mt-[1rem] overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead>
              <tr className="text-[#0A0A0A] font-inter font-medium">
                <th className="pb-1 pr-4 font-medium">Registry Type</th>
                <th className="pb-1 pr-4 font-medium text-right">Count</th>
                <th className="pb-1 font-medium text-right">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-2 text-[#9CA3AF]">
                    <div className="h-4 w-24 rounded bg-[#E5E7EB] animate-pulse" />
                  </td>
                </tr>
              ) : !popularTypes.length ? (
                <tr>
                  <td colSpan={3} className="py-2 text-[#9CA3AF]">
                    No registry type data for this period.
                  </td>
                </tr>
              ) : (
                popularTypes.map((row) => {
                  const pct =
                    typeof row.percentage === "number" &&
                    Number.isFinite(row.percentage)
                      ? `${(row.percentage * 100).toFixed(1)}%`
                      : "—";
                  return (
                    <tr key={row.type} className="border-t border-[#F3F4F6]">
                      <td className="py-1 pr-4 text-[#111827]">{row.type}</td>
                      <td className="py-1 pr-4 text-right text-[#111827]">
                        {formatCount(row.count || 0)}
                      </td>
                      <td className="py-1 text-right text-[#111827]">{pct}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {/* Gift fulfilment rate = (total registry item quantities purchased ÷ total registry item quantities needed) */}
        <MetricCard
          title="Gift Fulfilment Rate"
          value={renderPercentage(metrics?.giftFulfillmentRate)}
          description="% of registry items purchased"
        />
        <MetricCard
          title="User Growth Rate"
          value={renderPercentage(metrics?.userGrowthRate)}
          description="Month-over-month growth"
        />
        <MetricCard
          title="Returning Visitors"
          value={renderPercentage(metrics?.returningVisitors)}
          description="Tracked by cookies/login"
        />
      </div>
    </div>
  );
}

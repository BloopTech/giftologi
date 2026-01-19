"use client";
import React, { useEffect, useRef } from "react";
import { PiFileText, PiDownloadSimple } from "react-icons/pi";
import { useGenerateReportsContext } from "./context";

export default function GenerateReportsContent() {
  const {
    reports,
    dateRange,
    statusFilter,
    exportFormat,
    setDateRange,
    setStatusFilter,
    setExportFormat,
    recentReports,
    exportingReportId,
    error,
    generateReport,
    focusId,
  } = useGenerateReportsContext() || {};

  const lastAppliedFocusIdRef = useRef("");
  const focusIdValue = focusId ? String(focusId).trim() : "";

  useEffect(() => {
    if (!focusIdValue) return;
    if (lastAppliedFocusIdRef.current === focusIdValue) return;

    const el = document.getElementById(`report-card-${focusIdValue}`);
    if (!el) return;

    lastAppliedFocusIdRef.current = focusIdValue;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusIdValue]);

  const handleGenerate = async (reportId) => {
    if (!generateReport) return;
    await generateReport(reportId);
  };

  const renderRecentReport = (report) => {
    const createdAt = report.createdAt
      ? new Date(report.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

    return (
      <div
        key={report.id}
        className="flex items-center justify-between px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-full bg-[#EEF4FF] text-[#3979D2] w-8 h-8">
            <PiFileText className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[#0A0A0A]">
              {report.title}
            </span>
            <span className="text-[11px] text-[#717182]">
              {createdAt} - {report.format}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-[#D6D6D6] bg-white px-3 py-1 text-[11px] text-[#717182] cursor-default"
        >
          <PiDownloadSimple className="size-3 mr-1" />
          <span>Download</span>
        </button>
      </div>
    );
  };

  const renderReportCard = (report) => {
    const isExporting = exportingReportId === report.id;
    const isFocused = !!focusIdValue && String(report.id) === focusIdValue;

    return (
      <div
        key={report.id}
        id={`report-card-${report.id}`}
        className={
          isFocused
            ? "flex flex-col justify-between rounded-xl border border-[#D6D6D6] bg-[#EEF4FF] p-4 space-y-3 outline outline-[#3979D2] outline-offset-[-1px]"
            : "flex flex-col justify-between rounded-xl border border-[#D6D6D6] bg-white p-4 space-y-3"
        }
      >
        <div className="flex items-start gap-2">
          <div className="flex items-center justify-center rounded-full bg-[#F1F2F6] text-[#3979D2] w-7 h-7 mt-0.5">
            <PiFileText className="size-4" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs font-medium text-[#0A0A0A]">
              {report.title}
            </h3>
            <p className="mt-1 text-[11px] text-[#717182]">
              {report.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-2 text-[11px] text-[#717182]">
            <span className="font-medium text-[#4B5563]">
              Available Formats:
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-2 py-0.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] text-[10px]">
                PDF
              </span>
              <span className="px-2 py-0.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] text-[10px]">
                CSV
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#717182]">
            <span className="font-medium text-[#4B5563]">Access Level:</span>
            <span>{report.accessLevel}</span>
          </div>
        </div>

        <div className="mt-3 w-full">
          <button
            type="button"
            onClick={() => handleGenerate(report.id)}
            disabled={isExporting}
            className="w-full space-x-2 inline-flex items-center justify-center rounded-full bg-[#3979D2] px-4 py-2 text-[11px] font-medium text-white border border-[#3979D2] cursor-pointer hover:bg-white hover:text-[#3979D2] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <PiDownloadSimple className="size-4" />
            <span>{isExporting ? "Generating..." : "Generate Report"}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
      <div className="flex flex-col w-full">
        <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
          Generate Reports
        </h1>
        <span className="text-[#717182] text-xs/4 font-poppins">
          Export summary reports (PDF/CSV).
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[11px] text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,3fr] gap-4 w-full">
        <div className="flex flex-col space-y-3">
          <div className="rounded-xl border border-[#D6D6D6] bg-white p-4">
            <h2 className="text-xs font-medium text-[#0A0A0A] mb-1">
              Recent Report History
            </h2>
            <p className="text-[11px] text-[#717182] mb-3">
              Previously generated reports.
            </p>
            <div className="space-y-2">
              {recentReports && recentReports.length ? (
                recentReports.map((report) => renderRecentReport(report))
              ) : (
                <p className="text-[11px] text-[#9CA3AF]">
                  No reports generated yet.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#D6D6D6] bg-white p-4 flex flex-col space-y-3">
          <h2 className="text-xs font-medium text-[#0A0A0A]">
            Report Parameters
          </h2>
          <p className="text-[11px] text-[#717182]">
            Configure date range and filters for your report.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#717182]">Date Range</label>
              <select
                className="rounded-full border border-[#D6D6D6] bg-white px-3 py-2 text-xs text-[#0A0A0A] outline-none"
                value={dateRange || "last_30_days"}
                onChange={(event) => setDateRange?.(event.target.value)}
              >
                <option value="last_7_days">Last 7 days</option>
                <option value="last_30_days">Last 30 days</option>
                <option value="this_month">This month</option>
                <option value="this_year">This year</option>
                <option value="all_time">All time</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#717182]">
                Status Filter
              </label>
              <select
                className="rounded-full border border-[#D6D6D6] bg-white px-3 py-2 text-xs text-[#0A0A0A] outline-none"
                value={statusFilter || "all"}
                onChange={(event) => setStatusFilter?.(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active / Open</option>
                <option value="expired">Expired / Closed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#717182]">
                Export Format
              </label>
              <select
                className="rounded-full border border-[#D6D6D6] bg-white px-3 py-2 text-xs text-[#0A0A0A] outline-none"
                value={exportFormat || "pdf"}
                onChange={(event) => setExportFormat?.(event.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-1">
        {reports && reports.length
          ? reports.map((report) => renderReportCard(report))
          : null}
      </div>
    </div>
  );
}

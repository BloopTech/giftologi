"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryState, parseAsString } from "nuqs";

const AnalyticsReportingContext = createContext();

const DEFAULT_DATE_RANGE = "last_30_days";
const DEFAULT_TAB = "overview";

export const AnalyticsReportingProvider = ({ children }) => {
  const value = useAnalyticsReportingValue();

  return (
    <AnalyticsReportingContext.Provider value={value}>
      {children}
    </AnalyticsReportingContext.Provider>
  );
};

function useAnalyticsReportingValue() {
  const [rangeParam, setRangeParam] = useQueryState(
    "range",
    parseAsString.withDefault(DEFAULT_DATE_RANGE)
  );
  const [tabParam, setTabParam] = useQueryState(
    "tab",
    parseAsString.withDefault(DEFAULT_TAB)
  );

  const dateRange = rangeParam || DEFAULT_DATE_RANGE;
  const activeTab = tabParam || DEFAULT_TAB;

  const [overview, setOverview] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [vendorProduct, setVendorProduct] = useState(null);
  const [registryUser, setRegistryUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [lastQueuedExport, setLastQueuedExport] = useState(null);
  const [exportJobs, setExportJobs] = useState([]);
  const [exportJobsLoading, setExportJobsLoading] = useState(false);

  const fetchExportJobs = useCallback(async () => {
    setExportJobsLoading(true);

    try {
      const response = await fetch("/api/admin/analytics/exports", {
        method: "GET",
        cache: "no-store",
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load export jobs");
      }

      setExportJobs(Array.isArray(payload?.jobs) ? payload.jobs : []);
    } catch {
      // Keep analytics usable even if export history cannot be loaded
      setExportJobs([]);
    } finally {
      setExportJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/admin/analytics/summary?range=${encodeURIComponent(dateRange)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load analytics");
        }

        if (!ignore) {
          setOverview(payload?.overview || null);
          setFinancial(payload?.financial || null);
          setVendorProduct(payload?.vendorProduct || null);
          setRegistryUser(payload?.registryUser || null);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;

        if (!ignore) {
          setError(err?.message || "Failed to load analytics");
          setOverview(null);
          setFinancial(null);
          setVendorProduct(null);
          setRegistryUser(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [dateRange]);

  useEffect(() => {
    let ignore = false;

    const loadJobs = async () => {
      await fetchExportJobs();
      if (ignore) return;
    };

    loadJobs();

    const interval = setInterval(() => {
      loadJobs();
    }, 30000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [fetchExportJobs]);

  const exportSummary = useCallback(
    async (tabId) => {
      const id = tabId || activeTab;
      setExporting(true);

      try {
        const response = await fetch("/api/admin/analytics/exports", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tabId: id,
            dateRange,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to queue export");
        }

        setLastQueuedExport(payload?.job || null);
        await fetchExportJobs();

        return {
          ok: true,
          deduped: Boolean(payload?.deduped),
          job: payload?.job || null,
        };
      } catch (err) {
        return {
          ok: false,
          error: err?.message || "Failed to queue export",
        };
      } finally {
        setExporting(false);
      }
    },
    [activeTab, dateRange, fetchExportJobs]
  );

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/admin/analytics/summary?range=${encodeURIComponent(dateRange)}`, {
      method: "GET",
      cache: "no-store",
    })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to refresh analytics");
        }

        setOverview(payload?.overview || null);
        setFinancial(payload?.financial || null);
        setVendorProduct(payload?.vendorProduct || null);
        setRegistryUser(payload?.registryUser || null);
      })
      .catch((err) => {
        setError(err?.message || "Failed to refresh analytics");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dateRange]);

  return useMemo(
    () => ({
      dateRange,
      setDateRange: setRangeParam,
      activeTab,
      setActiveTab: setTabParam,
      overview,
      financial,
      vendorProduct,
      registryUser,
      loading,
      exporting,
      error,
      refresh,
      exportSummary,
      lastQueuedExport,
      exportJobs,
      exportJobsLoading,
      refreshExportJobs: fetchExportJobs,
    }),
    [
      dateRange,
      activeTab,
      overview,
      financial,
      vendorProduct,
      registryUser,
      loading,
      exporting,
      error,
      refresh,
      exportSummary,
      setRangeParam,
      setTabParam,
      lastQueuedExport,
      exportJobs,
      exportJobsLoading,
      fetchExportJobs,
    ]
  );
}

export const useAnalyticsReportingContext = () =>
  useContext(AnalyticsReportingContext);

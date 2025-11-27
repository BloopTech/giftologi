"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { useQueryState, parseAsString } from "nuqs";

const AnalyticsReportingContext = createContext();

export const AnalyticsReportingProvider = ({ children }) => {
  return (
    <AnalyticsReportingContext.Provider value={``}>
      {children}
    </AnalyticsReportingContext.Provider>
  );
};

export const useAnalyticsReportingContext = () =>
  useContext(AnalyticsReportingContext);

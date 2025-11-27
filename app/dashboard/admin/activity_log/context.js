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

const ActivityLogContext = createContext();

export const ActivityLogProvider = ({ children }) => {
  return (
    <ActivityLogContext.Provider value={``}>
      {children}
    </ActivityLogContext.Provider>
  );
};

export const useActivityLogContext = () =>
  useContext(ActivityLogContext);

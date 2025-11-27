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

const GenerateReportsContext = createContext();

export const GenerateReportsProvider = ({ children }) => {
  return (
    <GenerateReportsContext.Provider value={``}>
      {children}
    </GenerateReportsContext.Provider>
  );
};

export const useGenerateReportsContext = () =>
  useContext(GenerateReportsContext);

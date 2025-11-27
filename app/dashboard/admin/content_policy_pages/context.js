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

const ContentsPolicyContext = createContext();

export const ContentsPolicyProvider = ({ children }) => {
  return (
    <ContentsPolicyContext.Provider value={``}>
      {children}
    </ContentsPolicyContext.Provider>
  );
};

export const useContentsPolicyContext = () => useContext(ContentsPolicyContext);

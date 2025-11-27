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

const APIDocumentationContext = createContext();

export const APIDocumentationProvider = ({ children }) => {
  return (
    <APIDocumentationContext.Provider value={``}>
      {children}
    </APIDocumentationContext.Provider>
  );
};

export const useAPIDocumentationContext = () =>
  useContext(APIDocumentationContext);

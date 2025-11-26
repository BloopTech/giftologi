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

const ManageProductsContext = createContext();

export const ManageProductsProvider = ({ children }) => {
  return (
    <ManageProductsContext.Provider value={``}>
      {children}
    </ManageProductsContext.Provider>
  );
};

export const useManageProductsContext = () => useContext(ManageProductsContext);

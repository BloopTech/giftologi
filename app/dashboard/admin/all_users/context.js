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

const AllUsersContext = createContext();

export const AllUsersProvider = ({ children }) => {
  return (
    <AllUsersContext.Provider value={``}>{children}</AllUsersContext.Provider>
  );
};

export const useAllUsersContext = () => useContext(AllUsersContext);

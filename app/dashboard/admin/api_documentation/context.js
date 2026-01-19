"use client";
import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { useQueryState, parseAsString } from "nuqs";

const APIDocumentationContext = createContext();

function useAPIDocumentationValue() {
  const [queryParam, setQueryParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault("")
  );

  const query = queryParam || "";
  const focusId = focusIdParam || "";

  const setQuery = useCallback(
    (value) => {
      setQueryParam(value || "");
    },
    [setQueryParam]
  );

  const setFocusId = useCallback(
    (value) => {
      setFocusIdParam(value || "");
    },
    [setFocusIdParam]
  );

  return useMemo(
    () => ({
      query,
      setQuery,
      focusId,
      setFocusId,
    }),
    [query, setQuery, focusId, setFocusId]
  );
}

export const APIDocumentationProvider = ({ children }) => {
  const value = useAPIDocumentationValue();
  return (
    <APIDocumentationContext.Provider value={value}>
      {children}
    </APIDocumentationContext.Provider>
  );
};

export const useAPIDocumentationContext = () =>
  useContext(APIDocumentationContext);

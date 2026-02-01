"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const HostRegistryListContext = createContext();

const DEFAULT_PAGE_SIZE = 24;

export function HostRegistryListProvider({ children, pageSize = DEFAULT_PAGE_SIZE }) {
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [registries, setRegistries] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchProfileId = useCallback(async () => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .single();

    if (profileError || !profile?.id) {
      throw profileError || new Error("Unable to load profile");
    }

    return profile.id;
  }, [supabase]);

  const fetchPage = useCallback(
    async ({ nextPage, existingProfileId, append }) => {
      const currentProfileId = existingProfileId || profileId;
      if (!currentProfileId) return;

      const from = nextPage * pageSize;
      const to = from + pageSize - 1;

      const { data, error: fetchError } = await supabase
        .from("registries")
        .select(
          `
          id,
          title,
          registry_code,
          cover_photo,
          created_at,
          delivery_address:delivery_addresses(
            street_address,
            street_address_2,
            city,
            state_province,
            postal_code,
            gps_location,
            digital_address
          ),
          event:events!inner(
            id,
            host_id,
            date,
            location,
            privacy,
            type
          )
        `,
        )
        .eq("event.host_id", currentProfileId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fetchError) {
        throw fetchError;
      }

      const rows = Array.isArray(data) ? data : [];

      setRegistries((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === pageSize);
      setPage(nextPage);
    },
    [pageSize, profileId, supabase],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const id = await fetchProfileId();
      setProfileId(id);
      await fetchPage({ nextPage: 0, existingProfileId: id, append: false });
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, fetchProfileId]);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const id = profileId || (await fetchProfileId());
      if (!profileId) setProfileId(id);
      await fetchPage({ nextPage: page + 1, existingProfileId: id, append: true });
    } catch (e) {
      setError(e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchPage, fetchProfileId, hasMore, isLoadingMore, page, profileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      registries,
      isLoading,
      isLoadingMore,
      error,
      refresh,
      loadMore,
      hasMore,
    }),
    [registries, isLoading, isLoadingMore, error, refresh, loadMore, hasMore],
  );

  return (
    <HostRegistryListContext.Provider value={value}>
      {children}
    </HostRegistryListContext.Provider>
  );
}

export function useHostRegistryListContext() {
  return useContext(HostRegistryListContext);
}

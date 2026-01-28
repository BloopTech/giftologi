"use client";
import React, { useEffect, useState } from "react";
import CloseShopModal from "./CloseShopModal";
import { createClient } from "../../../../../utils/supabase/client";
import { useVendorDashboardContext } from "../../../context";
import { Loader2 } from "lucide-react";

export default function CloseShopButton() {
  const { vendor, loadingVendorData } = useVendorDashboardContext();
  const [existingRequest, setExistingRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExistingRequest = async () => {
      if (!vendor?.id) {
        setLoading(false);
        return;
      }

      if (vendor.shop_status !== "closing_requested") {
        setExistingRequest(null);
        setLoading(false);
        return;
      }

      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from("vendor_close_requests")
          .select("*")
          .eq("vendor_id", vendor.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error(
            "Error fetching close shop request:",
            error?.message || error,
          );
        }

        setExistingRequest(data);
      } catch (err) {
        console.error("Unexpected error fetching close request:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!loadingVendorData) {
      fetchExistingRequest();
    }
  }, [vendor?.id, vendor?.shop_status, loadingVendorData]);

  if (loadingVendorData || loading) {
    return (
      <div className="py-1 px-4 flex gap-8 w-full text-xs items-center text-gray-400">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!vendor?.id) {
    return null;
  }

  return (
    <CloseShopModal 
      vendorId={vendor.id} 
      existingRequest={existingRequest} 
    />
  );
}

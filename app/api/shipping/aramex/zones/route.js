import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../utils/supabase/server";
import { fetchAramexStates } from "../../../../utils/shipping/aramex";

const DEFAULT_COUNTRY_CODE = "GH";

const normalizeCountryCode = (value) =>
  String(value || "").trim().toUpperCase() || DEFAULT_COUNTRY_CODE;

const mapZonesResponse = (zones) =>
  (Array.isArray(zones) ? zones : []).map((zone) => ({
    id: zone.id,
    name: zone.name,
    fee: Number(zone.fee) || 0,
    aramex_code: zone.aramex_code || null,
    country_code: zone.country_code,
  }));

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = normalizeCountryCode(searchParams.get("country"));
    const forceRefresh = searchParams.get("refresh") === "1";

    const admin = createAdminClient();

    const { data: cachedZones, error: cacheError } = await admin
      .from("shipping_zones")
      .select("id, name, fee, aramex_code, country_code, active")
      .eq("country_code", countryCode)
      .eq("active", true)
      .order("name", { ascending: true });

    if (cacheError) {
      console.error("Failed to load cached shipping zones:", cacheError);
    }

    if (!forceRefresh && Array.isArray(cachedZones) && cachedZones.length > 0) {
      return NextResponse.json({
        success: true,
        source: "cache",
        zones: mapZonesResponse(cachedZones),
      });
    }

    const { hasErrors, message, states } = await fetchAramexStates({
      countryCode,
    });

    if (hasErrors || !Array.isArray(states)) {
      if (Array.isArray(cachedZones) && cachedZones.length > 0) {
        return NextResponse.json({
          success: true,
          source: "cache",
          zones: mapZonesResponse(cachedZones),
          warning: message || "Failed to refresh zones from Aramex",
        });
      }

      return NextResponse.json(
        {
          error: "Failed to fetch Aramex zones",
          details: message || "No zones returned",
        },
        { status: 502 }
      );
    }

    const now = new Date().toISOString();
    const upsertPayload = states
      .filter((state) => state?.name)
      .map((state) => ({
        country_code: countryCode,
        name: state.name,
        aramex_code: state.code || null,
        active: true,
        updated_at: now,
      }));

    if (upsertPayload.length > 0) {
      const { error: upsertError } = await admin
        .from("shipping_zones")
        .upsert(upsertPayload, { onConflict: "country_code,name" });

      if (upsertError) {
        console.error("Failed to upsert shipping zones:", upsertError);
      }
    }

    const { data: refreshedZones, error: refreshedError } = await admin
      .from("shipping_zones")
      .select("id, name, fee, aramex_code, country_code, active")
      .eq("country_code", countryCode)
      .eq("active", true)
      .order("name", { ascending: true });

    if (refreshedError) {
      console.error("Failed to load refreshed zones:", refreshedError);
    }

    return NextResponse.json({
      success: true,
      source: "aramex",
      zones: mapZonesResponse(refreshedZones || cachedZones || []),
    });
  } catch (error) {
    console.error("Shipping zones lookup failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

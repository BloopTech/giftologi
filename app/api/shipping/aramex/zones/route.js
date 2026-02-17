import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../utils/supabase/server";
import { fetchAramexStates } from "../../../../utils/shipping/aramex";

const DEFAULT_COUNTRY_CODE = "GH";

const COUNTRY_NAME_TO_CODE = {
  GHANA: "GH",
  NIGERIA: "NG",
  KENYA: "KE",
  SOUTH_AFRICA: "ZA",
  EGYPT: "EG",
  UAE: "AE",
  DUBAI: "AE",
  ABU_DHABI: "AE",
  SAUDI_ARABIA: "SA",
  UNITED_STATES: "US",
  USA: "US",
  UNITED_KINGDOM: "GB",
  UK: "GB",
  CANADA: "CA",
  AUSTRALIA: "AU",
  INDIA: "IN",
  PAKISTAN: "PK",
  BANGLADESH: "BD",
  SRI_LANKA: "LK",
  PHILIPPINES: "PH",
  INDONESIA: "ID",
  MALAYSIA: "MY",
  SINGAPORE: "SG",
  THAILAND: "TH",
  CHINA: "CN",
  JAPAN: "JP",
  KOREA: "KR",
  SOUTH_KOREA: "KR",
  GERMANY: "DE",
  FRANCE: "FR",
  ITALY: "IT",
  SPAIN: "ES",
  NETHERLANDS: "NL",
  BELGIUM: "BE",
  SWITZERLAND: "CH",
  AUSTRIA: "AT",
  PORTUGAL: "PT",
  IRELAND: "IE",
  DENMARK: "DK",
  NORWAY: "NO",
  SWEDEN: "SE",
  FINLAND: "FI",
  POLAND: "PL",
  CZECH_REPUBLIC: "CZ",
  GREECE: "GR",
  TURKEY: "TR",
  ISRAEL: "IL",
  JORDAN: "JO",
  LEBANON: "LB",
  KUWAIT: "KW",
  BAHRAIN: "BH",
  OMAN: "OM",
  QATAR: "QA",
  IRAQ: "IQ",
  IRAN: "IR",
  MOROCCO: "MA",
  TUNISIA: "TN",
  ALGERIA: "DZ",
  LIBYA: "LY",
  SUDAN: "SD",
  ETHIOPIA: "ET",
  UGANDA: "UG",
  TANZANIA: "TZ",
  ZAMBIA: "ZM",
  ZIMBABWE: "ZW",
  BOTSWANA: "BW",
  NAMIBIA: "NA",
  MOZAMBIQUE: "MZ",
  MALAWI: "MW",
  MADAGASCAR: "MG",
  MAURITIUS: "MU",
  SEYCHELLES: "SC",
  COMOROS: "KM",
  DJIBOUTI: "DJ",
  SOMALIA: "SO",
  ERITREA: "ER",
  CHAD: "TD",
  NIGER: "NE",
  MALI: "ML",
  BURKINA_FASO: "BF",
  SENEGAL: "SN",
  GAMBIA: "GM",
  GUINEA: "GN",
  SIERRA_LEONE: "SL",
  LIBERIA: "LR",
  IVORY_COAST: "CI",
  COTE_DIVOIRE: "CI",
  TOGO: "TG",
  BENIN: "BJ",
  CAMEROON: "CM",
  CENTRAL_AFRICAN_REPUBLIC: "CF",
  EQUATORIAL_GUINEA: "GQ",
  GABON: "GA",
  CONGO: "CG",
  DEMOCRATIC_REPUBLIC_OF_CONGO: "CD",
  DRC: "CD",
  ANGOLA: "AO",
  RWANDA: "RW",
  BURUNDI: "BI",
  SOUTH_SUDAN: "SS",
  LESOTHO: "LS",
  ESWATINI: "SZ",
  SWAZILAND: "SZ",
};

const normalizeCountryCode = (value) => {
  const trimmed = String(value || "").trim().toUpperCase();
  if (!trimmed) return DEFAULT_COUNTRY_CODE;

  // If already a 2-letter code, return as-is
  if (trimmed.length === 2 && /^[A-Z]{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Replace spaces and special chars with underscores for lookup
  const normalizedName = trimmed.replace(/[\s\-'.]+/g, "_");

  // Look up by full name
  return COUNTRY_NAME_TO_CODE[normalizedName] || trimmed.slice(0, 2);
};

const mapZonesResponse = (zones) =>
  (Array.isArray(zones) ? zones : []).map((zone) => ({
    id: zone.id,
    name: zone.name,
    fee: Number(zone.fee) || 0,
    aramex_code: zone.aramex_code || zone.name || null,
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

    const cacheHasAramexCodes =
      Array.isArray(cachedZones) &&
      cachedZones.length > 0 &&
      cachedZones.every((zone) => Boolean(zone?.aramex_code));

    if (
      !forceRefresh &&
      Array.isArray(cachedZones) &&
      cachedZones.length > 0 &&
      cacheHasAramexCodes
    ) {
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
        aramex_code: (state.code || state.name || "").trim() || null,
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

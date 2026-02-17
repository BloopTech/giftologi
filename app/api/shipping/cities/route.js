import { NextResponse } from "next/server";
import { fetchAramexCities } from "@/app/utils/shipping/aramex";

// Cache for Aramex cities by country+state
const aramexCitiesCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const normalizeCountryCode = (value) => {
  const normalized = String(value || "GH").trim().toUpperCase();
  if (!normalized) return "GH";
  if (normalized === "GHANA") return "GH";
  return normalized;
};

const makeCacheKey = ({ countryCode, stateCode }) =>
  `${countryCode}:${stateCode || "*"}`;

async function getAramexCities({ countryCode, stateCode }) {
  const cacheKey = makeCacheKey({ countryCode, stateCode });
  const cached = aramexCitiesCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(
      `Using cached Aramex cities for ${cacheKey}:`,
      cached.cities.length,
    );
    return { cities: cached.cities, error: null };
  }

  try {
    const result = await fetchAramexCities({ countryCode, stateCode });
    if (result.hasErrors) {
      console.error("Aramex cities API error:", result.message);
      return { cities: [], error: result.message || "Aramex cities API error" };
    }

    const dedupedSortedCities = [
      ...new Set(result.cities?.map((c) => c.name).filter(Boolean) || []),
    ].sort((a, b) => a.localeCompare(b));

    console.log(
      `Fetched Aramex cities for ${cacheKey}:`,
      dedupedSortedCities.length,
    );

    aramexCitiesCache.set(cacheKey, {
      cities: dedupedSortedCities,
      timestamp: Date.now(),
    });

    return { cities: dedupedSortedCities, error: null };
  } catch (error) {
    console.error("Failed to fetch Aramex cities:", error);
    return { cities: [], error: error?.message || "Failed to fetch Aramex cities" };
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = normalizeCountryCode(searchParams.get("country"));
    // Keep backward-compatibility with old client query param "region"
    const stateCode =
      searchParams.get("stateCode")?.trim() ||
      searchParams.get("region")?.trim() ||
      "";

    console.log("Cities API called:", { countryCode, stateCode });

    const { cities, error } = await getAramexCities({ countryCode, stateCode });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to fetch cities from Aramex.",
          details: error,
        },
        { status: 503 }
      );
    }

    if (!stateCode) {
      return NextResponse.json(
        {
          success: false,
          error: "stateCode (or region) query parameter is required.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      countryCode,
      stateCode,
      cities,
      source: "aramex",
      totalCount: cities.length
    });
  } catch (error) {
    console.error("Cities API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch cities" 
      },
      { status: 500 }
    );
  }
}

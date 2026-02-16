// Ghana cities mapped to their regions
// Areas/neighborhoods are mapped to their parent cities for Aramex validation

export const GHANA_CITIES = [
  // Greater Accra Region
  { name: "Accra", region: "Greater Accra", aliases: ["Accra-North", "Accra South", "North Accra", "South Accra"] },
  { name: "Tema", region: "Greater Accra", aliases: ["Tema Community", "Tema New Town"] },
  { name: "Madina", region: "Greater Accra", aliases: [] },
  { name: "East Legon", region: "Greater Accra", aliases: ["Legon", "West Legon"] },
  { name: "Dzorwulu", region: "Greater Accra", aliases: [], parentCity: "Accra" }, // Area in Accra
  { name: "Ablekuma", region: "Greater Accra", aliases: [], parentCity: "Accra" }, // Area in Accra
  { name: "Adabraka", region: "Greater Accra", aliases: [], parentCity: "Accra" },
  { name: "Osu", region: "Greater Accra", aliases: [], parentCity: "Accra" },
  { name: "Labadi", region: "Greater Accra", aliases: ["La"], parentCity: "Accra" },
  { name: "Airport City", region: "Greater Accra", aliases: [], parentCity: "Accra" },
  { name: "Teshie", region: "Greater Accra", aliases: [], parentCity: "Accra" },
  { name: "Nungua", region: "Greater Accra", aliases: [], parentCity: "Accra" },
  { name: "Adenta", region: "Greater Accra", aliases: [] },
  { name: "Ashaiman", region: "Greater Accra", aliases: [] },
  { name: "Kpone", region: "Greater Accra", aliases: [] },
  { name: "Dodowa", region: "Greater Accra", aliases: [] },
  { name: "Afienya", region: "Greater Accra", aliases: [] },
  { name: "Nsawam", region: "Greater Accra", aliases: [] },
  { name: "Amasaman", region: "Greater Accra", aliases: [] },
  
  // Ashanti Region
  { name: "Kumasi", region: "Ashanti", aliases: ["Kumasi Central"] },
  { name: "Obuasi", region: "Ashanti", aliases: [] },
  { name: "Ejisu", region: "Ashanti", aliases: [] },
  { name: "Konongo", region: "Ashanti", aliases: [] },
  { name: "Mampong", region: "Ashanti", aliases: [] },
  { name: "Bekwai", region: "Ashanti", aliases: [] },
  { name: "Techiman", region: "Ashanti", aliases: [] }, // Actually Bono East
  { name: "Sunyani", region: "Ashanti", aliases: [] }, // Actually Bono
  
  // Western Region
  { name: "Takoradi", region: "Western", aliases: ["Sekondi-Takoradi", "Sekondi"] },
  { name: "Axim", region: "Western", aliases: [] },
  { name: "Tarkwa", region: "Western", aliases: [] },
  { name: "Prestea", region: "Western", aliases: [] },
  { name: "Bogoso", region: "Western", aliases: [] },
  
  // Central Region
  { name: "Cape Coast", region: "Central", aliases: ["Cape"] },
  { name: "Elmina", region: "Central", aliases: [] },
  { name: "Winneba", region: "Central", aliases: [] },
  { name: "Mankessim", region: "Central", aliases: [] },
  { name: "Kasoa", region: "Central", aliases: [] },
  { name: "Swedru", region: "Central", aliases: ["Agona Swedru"] },
  { name: "Assin Fosu", region: "Central", aliases: [] },
  { name: "Twifo Praso", region: "Central", aliases: [] },
  
  // Eastern Region
  { name: "Koforidua", region: "Eastern", aliases: [] },
  { name: "Nsawam", region: "Eastern", aliases: [] },
  { name: "Suhum", region: "Eastern", aliases: [] },
  { name: "Akosombo", region: "Eastern", aliases: [] },
  { name: "Nkawkaw", region: "Eastern", aliases: [] },
  { name: "Aburi", region: "Eastern", aliases: [] },
  { name: "Somanya", region: "Eastern", aliases: [] },
  
  // Northern Region
  { name: "Tamale", region: "Northern", aliases: [] },
  { name: "Yendi", region: "Northern", aliases: [] },
  { name: "Walewale", region: "Northern", aliases: [] },
  { name: "Damongo", region: "Northern", aliases: [], parentCity: "Tamale" },
  { name: "Bole", region: "Northern", aliases: [] },
  
  // Upper East Region
  { name: "Bolgatanga", region: "Upper East", aliases: ["Bolga"] },
  { name: "Bawku", region: "Upper East", aliases: [] },
  { name: "Navrongo", region: "Upper East", aliases: [] },
  { name: "Zebilla", region: "Upper East", aliases: [] },
  
  // Upper West Region
  { name: "Wa", region: "Upper West", aliases: [] },
  { name: "Tumu", region: "Upper West", aliases: [] },
  { name: "Lawra", region: "Upper West", aliases: [] },
  { name: "Jirapa", region: "Upper West", aliases: [] },
  
  // Volta Region
  { name: "Ho", region: "Volta", aliases: [] },
  { name: "Keta", region: "Volta", aliases: [] },
  { name: "Hohoe", region: "Volta", aliases: [] },
  { name: "Aflao", region: "Volta", aliases: [] },
  { name: "Denu", region: "Volta", aliases: [] },
  { name: "Anloga", region: "Volta", aliases: [] },
  { name: "Kpando", region: "Volta", aliases: [] },
  { name: "Sogakope", region: "Volta", aliases: [] },
  
  // Bono Region
  { name: "Sunyani", region: "Bono", aliases: [] },
  { name: "Techiman", region: "Bono", aliases: [], parentCity: "Sunyani" },
  { name: "Berekum", region: "Bono", aliases: [] },
  { name: "Dormaa Ahenkro", region: "Bono", aliases: [] },
  { name: "Wenchi", region: "Bono", aliases: [] },
  
  // Bono East Region
  { name: "Techiman", region: "Bono East", aliases: [] },
  { name: "Kintampo", region: "Bono East", aliases: [] },
  { name: "Nkoranza", region: "Bono East", aliases: [] },
  { name: "Yeji", region: "Bono East", aliases: [] },
  
  // Ahafo Region
  { name: "Goaso", region: "Ahafo", aliases: [] },
  { name: "Bechem", region: "Ahafo", aliases: [] },
  { name: "Duayaw Nkwanta", region: "Ahafo", aliases: [] },
  { name: "Mim", region: "Ahafo", aliases: [] },
  
  // North East Region
  { name: "Nalerigu", region: "North East", aliases: [] },
  { name: "Walewale", region: "North East", aliases: [] },
  { name: "Chereponi", region: "North East", aliases: [] },
  
  // Savannah Region
  { name: "Damongo", region: "Savannah", aliases: [] },
  { name: "Buipe", region: "Savannah", aliases: [] },
  { name: "Sawla", region: "Savannah", aliases: [] },
  { name: "Salaga", region: "Savannah", aliases: [] },
  
  // Oti Region
  { name: "Dambai", region: "Oti", aliases: [] },
  { name: "Nkwanta", region: "Oti", aliases: [] },
  { name: "Jasikan", region: "Oti", aliases: [] },
  { name: "Kadjebi", region: "Oti", aliases: [] },
  
  // Western North Region
  { name: "Sefwi Wiawso", region: "Western North", aliases: [] },
  { name: "Bibiani", region: "Western North", aliases: [] },
  { name: "Enchi", region: "Western North", aliases: [] },
  { name: "Juaboso", region: "Western North", aliases: [] },
];

// Create lookup maps for quick access
const cityByName = new Map();
const cityByAlias = new Map();

GHANA_CITIES.forEach(city => {
  const normalizedName = city.name.toLowerCase();
  cityByName.set(normalizedName, city);
  
  // Add aliases
  city.aliases.forEach(alias => {
    cityByAlias.set(alias.toLowerCase(), city);
  });
  
  // Also map the city name itself as an alias for lookup
  cityByAlias.set(normalizedName, city);
});

/**
 * Normalize a city name to a valid Aramex city
 * Returns the parent city if the input is an area/neighborhood, or the city itself if found
 * Falls back to returning the input unchanged if no match found
 */
export function normalizeCityName(cityInput) {
  if (!cityInput) return "";
  
  const normalized = cityInput.toLowerCase().trim();
  
  // Direct match
  const directMatch = cityByName.get(normalized);
  if (directMatch) {
    // If this area has a parent city (e.g., Dzorwulu → Accra), return the parent
    return directMatch.parentCity || directMatch.name;
  }
  
  // Alias match
  const aliasMatch = cityByAlias.get(normalized);
  if (aliasMatch) {
    return aliasMatch.parentCity || aliasMatch.name;
  }
  
  // Check for region names being passed as cities (common mistake)
  const regionNames = [
    "greater accra", "ashanti", "western", "central", "eastern", 
    "northern", "upper east", "upper west", "volta", "bono", 
    "bono east", "ahafo", "north east", "savannah", "oti", "western north"
  ];
  if (regionNames.includes(normalized)) {
    // Return the capital/major city of that region
    const regionCapitals = {
      "greater accra": "Accra",
      "ashanti": "Kumasi",
      "western": "Takoradi",
      "central": "Cape Coast",
      "eastern": "Koforidua",
      "northern": "Tamale",
      "upper east": "Bolgatanga",
      "upper west": "Wa",
      "volta": "Ho",
      "bono": "Sunyani",
      "bono east": "Techiman",
      "ahafo": "Goaso",
      "north east": "Nalerigu",
      "savannah": "Damongo",
      "oti": "Dambai",
      "western north": "Sefwi Wiawso",
    };
    return regionCapitals[normalized] || cityInput;
  }
  
  // Try partial match for compound names (e.g., "Accra-North" → "Accra")
  for (const [alias, city] of cityByAlias) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return city.parentCity || city.name;
    }
  }
  
  // No match found, return original (let Aramex validate)
  return cityInput;
}

/**
 * Get list of cities for a given region
 */
export function getCitiesByRegion(regionName) {
  if (!regionName) return [];
  
  const normalizedRegion = regionName.toLowerCase().trim();
  return GHANA_CITIES
    .filter(city => city.region.toLowerCase() === normalizedRegion)
    .map(city => city.name)
    .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates
}

/**
 * Check if a city name is valid/recognized
 */
export function isValidCity(cityInput) {
  if (!cityInput) return false;
  
  const normalized = cityInput.toLowerCase().trim();
  return cityByName.has(normalized) || cityByAlias.has(normalized);
}

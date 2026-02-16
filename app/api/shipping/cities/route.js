import { NextResponse } from "next/server";
import { fetchAramexCities } from "@/app/utils/shipping/aramex";

// Mapping of Aramex cities to Ghana regions (based on actual geography)
const CITY_TO_REGION = {
  // Greater Accra
  "Accra": "Greater Accra", "Tema": "Greater Accra", "Madina": "Greater Accra", 
  "East Legon": "Greater Accra", "Teshie": "Greater Accra", "Nungua": "Greater Accra",
  "La": "Greater Accra", "Adenta": "Greater Accra", "Ashaiman": "Greater Accra",
  "Kpone": "Greater Accra", "Afienya": "Greater Accra", "Dawhenya": "Greater Accra",
  "Osu": "Greater Accra", "Labone": "Greater Accra", "Cantonments": "Greater Accra",
  "Airport Residential": "Greater Accra", "Dzorwulu": "Greater Accra", 
  "North Legon": "Greater Accra", "West Legon": "Greater Accra",
  "Adabraka": "Greater Accra", "Dansoman": "Greater Accra", "Kaneshie": "Greater Accra",
  "Circle": "Greater Accra", "Abokobi": "Greater Accra", "Adjei Kojo": "Greater Accra",
  "Baatsona": "Greater Accra", "Dodowa": "Greater Accra", "Gbawe": "Greater Accra",
  "Kokomlemle": "Greater Accra", "Kwabenya": "Greater Accra", "Lashibi": "Greater Accra",
  "McCarthy": "Greater Accra", "Michel Camp": "Greater Accra", "Ningo": "Greater Accra",
  "Odorkor": "Greater Accra", "Old Ningo": "Greater Accra", "Prampram": "Greater Accra",
  "Sakumono": "Greater Accra", "Sowutwuom": "Greater Accra", "Taifa": "Greater Accra",
  "Tema New Town": "Greater Accra", "Teshie Nungua Estates": "Greater Accra",
  "Weija": "Greater Accra", "Labadi": "Greater Accra", "Pokuasi": "Greater Accra",
  "Achimota": "Greater Accra", "Amasaman": "Greater Accra", "Kasoa": "Greater Accra",
  
  // Ashanti
  "Kumasi": "Ashanti", "Obuasi": "Ashanti", "Ejisu": "Ashanti", "Konongo": "Ashanti",
  "Mampong": "Ashanti", "Tafo": "Ashanti", "Agogo": "Ashanti", "Nkawie": "Ashanti",
  "Asokwa": "Ashanti", "Bantama": "Ashanti", "Suame": "Ashanti",
  "Asokore Mampong": "Ashanti", "Bekwai": "Ashanti", "Juaben": "Ashanti",
  "Kumawu": "Ashanti", "Mamponteng": "Ashanti", "Offinso": "Ashanti",
  "Tepa": "Ashanti", "Effiduase": "Ashanti", "Fomena": "Ashanti",
  "Akrofuom": "Ashanti", "Akomadan": "Ashanti", "Kuntanse": "Ashanti",
  "Jacobu": "Ashanti", "Ofoase": "Ashanti", "Tutuka": "Ashanti",
  "Essarkyir": "Ashanti", "Barekese": "Ashanti", "Adansi Asokwa": "Ashanti",
  
  // Western
  "Takoradi": "Western", "Sekondi": "Western", "Tarkwa": "Western", "Axim": "Western",
  "Prestea": "Western", "Bibiani": "Western", "Shama": "Western", "Agona Nkwanta": "Western",
  "Anaji": "Western", "Apowa": "Western", "Asankrangwa": "Western",
  "Bogoso": "Western", "Daboase": "Western", "Effiakuma": "Western",
  "Essikado": "Western", "Essipong": "Western", "Fijai": "Western",
  "Half Assini": "Western", "Huni Valley": "Western", "Inchaban": "Western",
  "Kojokrom": "Western", "Manso Amenfi": "Western", "New Takoradi": "Western",
  "Wassa-Akropong": "Western", "Mpohor": "Western", "Hemang": "Western",
  "Subriso": "Western", "Awaso": "Western", "Diaso": "Western",
  "Kwesimintsim": "Western", "Agona Ahanta": "Western", "Achiase": "Western",
  "Mankranso": "Western", "Asesewa": "Western", "Nsuaem": "Western",
  "Breman Asikuma": "Western", "Juaboso": "Western",
  
  // Central
  "Cape Coast": "Central", "Winneba": "Central", "Swedru": "Central",
  "Elmina": "Central", "Saltpond": "Central", "Mankessim": "Central", "Apam": "Central",
  "Dunkwa": "Central", "Dunkwa-On-Offin": "Central", "Abura Dunkwa": "Central",
  "Ajumako": "Central", "Anomabo": "Central", "Asebu": "Central",
  "Assin Fosu": "Central", "Assin Bereku": "Central",
  "Budumburam": "Central", "Duakor": "Central", "Jukwa": "Central",
  "Kakraba": "Central", "Kormantse": "Central", "Mumford": "Central",
  "Nkanfoa": "Central", "Oduponkpehe": "Central", "Pedu": "Central",
  "Pomadze": "Central", "Senya Breku": "Central", "Yamoransa": "Central",
  "Awutu Breku": "Central", "Coaltar": "Central", "Nsaba": "Central",
  "Bawjiase": "Central", "Gyasikan": "Central", "Doblu": "Central",
  "Anfeoga": "Central", "Afransi": "Central", "Kukurantumi": "Central",
  
  // Eastern
  "Koforidua": "Eastern", "Nsawam": "Eastern", "Suhum": "Eastern", "Akim Oda": "Eastern",
  "Akwatia": "Eastern", "Kibi": "Eastern", "Somanya": "Eastern", "Aburi": "Eastern",
  "Mpraeso": "Eastern", "Adeiso": "Eastern", "Akropong": "Eastern",
  "Asamankese": "Eastern", "Atimpoku": "Eastern",
  "Begoro": "Eastern", "Bepong": "Eastern", "Bunsu": "Eastern",
  "Donkorkrom": "Eastern", "Kade": "Eastern",
  "Kwabeng": "Eastern", "Mamfe": "Eastern", "Nkawkaw": "Eastern",
  "Ofoase": "Eastern", "Tease": "Eastern", "Anum": "Eastern",
  "Akwaserom": "Eastern", "Teacher Mante": "Eastern",
  "Bisa": "Eastern", "Ehiamankyene": "Eastern", "Huhunya": "Eastern",
  "Nsuta": "Eastern", "Akim Swedru": "Eastern", "Akuse": "Eastern",
  
  // Northern
  "Tamale": "Northern", "Yendi": "Northern", "Savelugu": "Northern", "Walewale": "Northern",
  "Bimbilla": "Northern", "Damongo": "Northern", "Salaga": "Northern",
  "Buipe": "Northern", "Chereponi": "Northern", "Daboya": "Northern",
  "Gambaga": "Northern", "Garu": "Northern", "Gushegu": "Northern",
  "Karaga": "Northern", "Kpandai": "Northern", "Larabanga": "Northern",
  "Nakpanduri": "Northern", "Nalerigu": "Northern", "Pong": "Northern",
  "Saboba": "Northern", "Sang": "Northern", "Sawla": "Northern",
  "Tatale": "Northern", "Tolon": "Northern", "Wulensi": "Northern",
  "Yagaba": "Northern", "Zabzugu": "Northern", "Kumbungu": "Northern",
  "Sagnarigu": "Northern", "Kpalbe": "Northern", "Yapei": "Northern",
  "Mankuma": "Northern", "Binduri": "Northern",
  
  // Upper East
  "Bolgatanga": "Upper East", "Bawku": "Upper East", "Navrongo": "Upper East",
  "Zebilla": "Upper East", "Bongo": "Upper East", "Pusiga": "Upper East",
  "Sandema": "Upper East", "Tongo": "Upper East", "Widnaba": "Upper East",
  "Nangodi": "Upper East", "Bunkpurugu": "Upper East",
  
  // Upper West  
  "Wa": "Upper West", "Lawra": "Upper West", "Tumu": "Upper West", "Nandom": "Upper West",
  "Jirapa": "Upper West", "Funsi": "Upper West", "Guli": "Upper West",
  "Gwollu": "Upper West", "Issa": "Upper West", "Kaleo": "Upper West",
  "Lambussie": "Upper West", "Lassia": "Upper West", "Nadowli": "Upper West",
  "Weichiau": "Upper West", "Zuarugu": "Upper West", "Tumu": "Upper West",
  
  // Volta
  "Ho": "Volta", "Keta": "Volta", "Aflao": "Volta", "Denu": "Volta",
  "Akatsi": "Volta", "Kpando": "Volta", "Hohoe": "Volta", "Anloga": "Volta",
  "Abutia": "Volta", "Adaklu Waya": "Volta", "Adidome": "Volta",
  "Anfoega": "Volta", "Anyako": "Volta", "Atiavi": "Volta",
  "Dabala": "Volta", "Dzodze": "Volta", "Fesi": "Volta",
  "Have": "Volta", "Klikor": "Volta", "Kpeve": "Volta", "Leklebi": "Volta",
  "Mafi": "Volta", "Peki": "Volta", "Sogakope": "Volta", "Vakpo": "Volta",
  "Wheta": "Volta", "Ziope": "Volta", "Keta Krachi": "Volta",
  "Ave Dakpa": "Volta", "Battor Dugame": "Volta", "Aflao": "Volta",
  "Dzolokpuita": "Volta",
  
  // Oti
  "Dambai": "Oti", "Nkwanta": "Oti", "Kadjebi": "Oti", "Jasikan": "Oti",
  "Bimbagu": "Oti", "Chinderi": "Oti", "Kete Krachi": "Oti", "Nantom": "Oti",
  "Poase": "Oti", "Kpassa": "Oti", "Nkwanta": "Oti",
  
  // Bono
  "Sunyani": "Bono", "Techiman": "Bono", "Berekum": "Bono", "Dormaa Ahenkro": "Bono",
  "Wenchi": "Bono", "Atronie": "Bono", "Banda Ahenkro": "Bono",
  "Bomaa": "Bono", "Drobo": "Bono", "Hwidiem": "Bono", "Jinijini": "Bono",
  "Kenyase": "Bono", "Nkrankrom": "Bono", "Nsuhia": "Bono",
  "Odumase": "Bono", "Seikwa": "Bono", "Sampa": "Bono",
  "Dormaa": "Bono",
  
  // Bono East
  "Kintampo": "Bono East", "Nkoranza": "Bono East", "Yeji": "Bono East",
  "Abease": "Bono East", "Amanten": "Bono East", "Anyima": "Bono East",
  "Busunya": "Bono East", "Jema": "Bono East", "Kwame Danso": "Bono East",
  "New Longoro": "Bono East", "Prang": "Bono East", "Attebubu": "Bono East",
  
  // Ahafo
  "Goaso": "Ahafo", "Bechem": "Ahafo", "Duayaw Nkwanta": "Ahafo", "Mim": "Ahafo",
  "Acherensua": "Ahafo", "Kenyasi": "Ahafo", "Kukuom": "Ahafo",
  "Nkrankwanta": "Ahafo", "Sankore": "Ahafo", "Asiwa": "Ahafo",
  
  // Savannah
  "Bole": "Savannah", "Damongo": "Savannah", "Salaga": "Savannah", "Sawla": "Savannah",
  "Daboya": "Savannah", "Kpalba": "Savannah", "Mankuma": "Savannah",
  
  // North East
  "Nalerigu": "North East", "Walewale": "North East", "Yagaba": "North East",
  "Chereponi": "North East", "Bunkpurugu": "North East",
  "Janga": "North East", "Karaga": "North East", "Kubori": "North East",
  "Nabango": "North East", "Namembini": "North East", "Wungu": "North East",
  
  // Western North
  "Sefwi Wiawso": "Western North", "Sefwi Bekwai": "Western North", "Enchi": "Western North",
  "Juaboso": "Western North", "Akontombra": "Western North", "Adabokrom": "Western North",
  "Bodi": "Western North", "Dadieso": "Western North", "Wiawso": "Western North",
  "Boamang": "Western North", "Wemfie": "Western North", "Sefwi Wiawso": "Western North",
  
  // Additional cities from Aramex that need classification
  "Abetifi": "Eastern", "Achiase": "Eastern", "Adukrom": "Eastern",
  "Afransi": "Central", "Akim Oda": "Eastern", "Akim Swedru": "Eastern",
  "Akomadan": "Ashanti", "Akrofuom": "Ashanti", "Akropong": "Eastern",
  "Akuse": "Eastern", "Akwatia": "Eastern", "Amasaman": "Greater Accra",
  "Anfeoga": "Volta", "Anloga": "Volta", "Anyinam": "Eastern",
  "Apam": "Central", "Asamankese": "Eastern", "Asankrangwa": "Western",
  "Asesewa": "Eastern", "Asiwa": "Ahafo", "Assin Bereku": "Central",
  "Assin Fosu": "Central", "Atimpoku": "Eastern", "Attebubu": "Bono East",
  "Ave Dakpa": "Volta", "Awaso": "Western", "Awutu Breku": "Central",
  "Axim": "Western", "Ayekuma": "Western", "Banda Ahenkro": "Bono",
  "Barekese": "Ashanti", "Battor Dugame": "Volta", "Bawku": "Upper East",
  "Bechem": "Ahafo", "Begoro": "Eastern", "Bekwai": "Ashanti",
  "Berekum": "Bono", "Bibiani": "Western", "Big Ada": "Greater Accra",
  "Bimbilla": "Northern", "Binduri": "Northern", "Boamang": "Western North",
  "Bodi": "Western North", "Bole": "Savannah", "Bolgatanga": "Upper East",
  "Bongo": "Upper East", "Breman Asikuma": "Central", "Buipe": "Northern",
  "Bunkpurugu": "North East", "Busunya": "Bono East", "Chereponi": "North East",
  "Chinderi": "Oti", "Coaltar": "Central", "Daboase": "Western",
  "Daboya": "Northern", "Dadieso": "Western North", "Damango": "Northern",
  "Dambai": "Oti", "Damongo": "Savannah", "Denu": "Volta", "Diaso": "Western",
  "Doblu": "Western", "Dodowa": "Greater Accra", "Donkorkrom": "Eastern",
  "Dormaa": "Bono", "Dormaa Ahenkro": "Bono", "Drobo": "Bono",
  "Drobonso": "Ashanti", "Duayaw Nkwanta": "Ahafo", "Dunkwa": "Central",
  "Dunkwa-On-Offin": "Central", "Dzolokpuita": "Volta", "Dzodze": "Volta",
  "Effiduase": "Ashanti", "Ejisu": "Ashanti", "Ejura": "Ashanti",
  "Elmina": "Central", "Enchi": "Western North", "Essam": "Eastern",
  "Essarkyir": "Ashanti", "Fomena": "Ashanti", "Fumbisi": "Upper East",
  "Funsi": "Upper West", "Gambaga": "Northern", "Garu": "Northern",
  "Goaso": "Ahafo", "Gushegu": "Northern", "Gwollu": "Upper West",
  "Gyasikan": "Central", "Half Assini": "Western", "Hemang": "Western",
  "Ho": "Volta", "Hohoe": "Volta", "Hwidiem": "Bono", "Issa": "Upper West",
  "Jacobu": "Ashanti", "Jasikan": "Oti", "Jema": "Bono East",
  "Jinijini": "Bono", "Jirapa": "Upper West", "Juaben": "Ashanti",
  "Juaboso": "Western North", "Juapong": "Eastern", "Juaso": "Ashanti",
  "Kade": "Eastern", "Kadjebi": "Oti", "Kajaji": "Savannah", "Karaga": "North East",
  "Kenyasi": "Ahafo", "Keta": "Volta", "Keta Krachi": "Volta",
  "Kete Krachi": "Oti", "Kibi": "Eastern", "Kintampo": "Bono East",
  "Kpalbe": "Northern", "Kpandai": "Northern", "Kpando": "Volta",
  "Kpassa": "Oti", "Kpetoe": "Volta", "Kpeve": "Volta", "Kukuom": "Ahafo",
  "Kukurantumi": "Eastern", "Kumawu": "Ashanti", "Kumbungu": "Northern",
  "Kuntanse": "Ashanti", "Kwabeng": "Eastern", "Kwadaso": "Ashanti",
  "Kwame Danso": "Bono East", "Kwesimintsim": "Western", "Lambussie": "Upper West",
  "Lawra": "Upper West", "Legon": "Greater Accra", "Mampong": "Ashanti",
  "Mamponteng": "Ashanti", "Mankranso": "Western", "Manso": "Western",
  "Manso Adubia": "Ashanti", "Manso Amenfi": "Western", "Manso Nkwanta": "Western",
  "Mpohor": "Western", "Mpraeso": "Eastern", "Nadowli": "Upper West",
  "Nalerigu": "North East", "Nandom": "Upper West", "Nangodi": "Upper East",
  "Nanton": "Northern", "Navrongo": "Upper East", "New Abirim": "Eastern",
  "Nkawie": "Ashanti", "Nkawkaw": "Eastern", "Nkonya": "Oti",
  "Nkoranza": "Bono East", "Nkrankwanta": "Ahafo", "Nkrankwanta": "Western North",
  "Nkroful": "Western", "Nkwanta": "Oti", "Nsaba": "Central",
  "Nsawam": "Eastern", "Nsawkaw": "Western North", "Nsuaem": "Western",
  "Nsuta": "Eastern", "Nungua": "Greater Accra", "Nyinahin": "Ashanti",
  "Odomasi": "Eastern", "Odumase": "Eastern", "Offinso": "Ashanti",
  "Ofoase": "Eastern", "Oforikrom": "Ashanti", "Old Tafo": "Ashanti",
  "Osino": "Eastern", "Paga": "Upper East", "Pokuasi": "Greater Accra",
  "Potsin": "Central", "Prampram": "Greater Accra", "Prang": "Bono East",
  "Prestea": "Western", "Pusiga": "Upper East", "Saboba": "Northern",
  "Sagnarigu": "Northern", "Salaga": "Northern", "Saltpond": "Central",
  "Sampa": "Bono", "Sandema": "Upper East", "Sang": "Northern",
  "Savelugu": "Northern", "Sawla": "Savannah", "Sefwi Wiawso": "Western North",
  "Sege": "Greater Accra", "Sekondi": "Western", "Shama": "Western",
  "Sogakope": "Volta", "Somanya": "Eastern", "Suame": "Ashanti",
  "Suhum": "Eastern", "Sunyani": "Bono", "Swedru": "Central",
  "Takoradi": "Western", "Tamale": "Northern", "Tarkwa": "Western",
  "Tatale": "Northern", "Tease": "Eastern", "Techiman": "Bono",
  "Tema": "Greater Accra", "Tempane": "Upper East", "Tepa": "Ashanti",
  "Teshie": "Greater Accra", "Tolon": "Northern", "Tongo": "Upper East",
  "Tumu": "Upper West", "Tuoabodom": "Bono", "Tutuka": "Ashanti",
  "Twifo Praso": "Central", "Ve-Golokwati": "Volta", "Wa": "Upper West",
  "Walewale": "North East", "Wassa-Akropong": "Western", "Weichiau": "Upper West",
  "Wemfie": "Western North", "Wenchi": "Bono", "Wiawso": "Western North",
  "Winneba": "Central", "Wulensi": "Northern", "Yagaba": "North East",
  "Yapei": "Savannah", "Yeji": "Bono East", "Yendi": "Northern",
  "Yunyoo": "North East", "Zabzugu": "Northern", "Zebilla": "Upper East",
  "Zuarugu": "Upper West"
};

// Cache for Aramex cities
let cachedAramexCities = null;
let cacheTimestamp = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getAramexCitiesForGhana() {
  // Return cached if valid
  if (cachedAramexCities && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    console.log("Using cached Aramex cities:", cachedAramexCities.length);
    return cachedAramexCities;
  }
  
  try {
    // Fetch all cities for Ghana (no state filter - Aramex doesn't filter well by state)
    const result = await fetchAramexCities({ countryCode: "GH" });
    if (result.hasErrors) {
      console.error("Aramex cities API error:", result.message);
      return null;
    }
    
    const cities = result.cities?.map(c => c.name).filter(Boolean) || [];
    console.log("Fetched Aramex cities:", cities.length);
    
    // Cache the results
    cachedAramexCities = cities;
    cacheTimestamp = Date.now();
    
    return cities;
  } catch (error) {
    console.error("Failed to fetch Aramex cities:", error);
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region");
    
    console.log("Cities API called for region:", region);

    // Get all cities from Aramex
    const aramexCities = await getAramexCitiesForGhana();
    
    if (!aramexCities || aramexCities.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Unable to fetch cities from Aramex. Please try again later." 
        },
        { status: 503 }
      );
    }

    // Return ALL Aramex cities - no region filtering
    // All cities from Aramex are valid shipping destinations
    const cities = aramexCities.sort();

    return NextResponse.json({ 
      success: true, 
      region,
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

// G2 boundary resolution: placeName+tier → geoCode + display coords.
// v1 uses a curated country/province table (whitelist countries first);
// geoBoundaries polygons arrive in spec 02 task 1 for hover fills.

interface CountryEntry {
  iso2: string;       // geoCode root
  name: string;       // canonical English name
  aliases: string[];  // common variants
  lng: number;        // representative point (centroid-ish)
  lat: number;
}

export const COUNTRIES: CountryEntry[] = [
  { iso2: "US", name: "United States", aliases: ["US", "USA", "America", "United States of America", "Washington"], lng: -98, lat: 39 },
  { iso2: "GB", name: "United Kingdom", aliases: ["UK", "Britain", "Great Britain", "England"], lng: -2, lat: 54 },
  { iso2: "FR", name: "France", aliases: ["France"], lng: 2.3, lat: 46.6 },
  { iso2: "DE", name: "Germany", aliases: ["Germany", "Berlin"], lng: 10.4, lat: 51.2 },
  { iso2: "RU", name: "Russia", aliases: ["Russia", "Moscow", "Russian Federation"], lng: 39, lat: 58 },
  { iso2: "QA", name: "Qatar", aliases: ["Qatar", "Doha"], lng: 51.2, lat: 25.3 },
  { iso2: "JP", name: "Japan", aliases: ["Japan", "Tokyo"], lng: 138.5, lat: 36.5 },
  { iso2: "KR", name: "South Korea", aliases: ["South Korea", "Korea", "Seoul", "Republic of Korea"], lng: 127.8, lat: 36.4 },
  { iso2: "AU", name: "Australia", aliases: ["Australia", "Canberra", "Sydney"], lng: 134, lat: -25.5 },
  { iso2: "SG", name: "Singapore", aliases: ["Singapore"], lng: 103.8, lat: 1.35 },
  { iso2: "ID", name: "Indonesia", aliases: ["Indonesia", "Jakarta", "Java"], lng: 110, lat: -5 },
  { iso2: "PK", name: "Pakistan", aliases: ["Pakistan", "Islamabad", "Karachi"], lng: 69.4, lat: 30.4 },
  { iso2: "CN", name: "China", aliases: ["China", "Beijing", "PRC"], lng: 105, lat: 35 },
  { iso2: "IN", name: "India", aliases: ["India", "New Delhi", "Delhi"], lng: 78.9, lat: 22 },
  { iso2: "BR", name: "Brazil", aliases: ["Brazil", "Brasilia"], lng: -51.9, lat: -10.8 },
  { iso2: "MX", name: "Mexico", aliases: ["Mexico", "Mexico City"], lng: -102.5, lat: 23.6 },
  { iso2: "ZA", name: "South Africa", aliases: ["South Africa", "Johannesburg", "Cape Town"], lng: 24.7, lat: -29 },
  { iso2: "TR", name: "Türkiye", aliases: ["Turkey", "Türkiye", "Ankara", "Istanbul"], lng: 35.2, lat: 39 },
  { iso2: "UA", name: "Ukraine", aliases: ["Ukraine", "Kyiv", "Kiev"], lng: 31.2, lat: 48.4 },
  { iso2: "IL", name: "Israel", aliases: ["Israel", "Tel Aviv", "Jerusalem"], lng: 35, lat: 31.4 },
  { iso2: "PS", name: "Palestine", aliases: ["Palestine", "Gaza", "West Bank"], lng: 35.2, lat: 31.9 },
  { iso2: "TW", name: "Taiwan", aliases: ["Taiwan", "Taipei"], lng: 121, lat: 23.7 },
  { iso2: "KP", name: "North Korea", aliases: ["North Korea", "DPRK", "Pyongyang"], lng: 127.2, lat: 40 },
  { iso2: "IR", name: "Iran", aliases: ["Iran", "Tehran"], lng: 53.7, lat: 32.4 },
  { iso2: "SA", name: "Saudi Arabia", aliases: ["Saudi Arabia", "Riyadh"], lng: 45.1, lat: 24 },
  { iso2: "YE", name: "Yemen", aliases: ["Yemen", "Sanaa", "Hodeidah"], lng: 47.5, lat: 15.6 },
  { iso2: "ET", name: "Ethiopia", aliases: ["Ethiopia", "Addis Ababa"], lng: 39.6, lat: 9.1 },
  { iso2: "DJ", name: "Djibouti", aliases: ["Djibouti"], lng: 42.6, lat: 11.8 },
  { iso2: "ML", name: "Mali", aliases: ["Mali", "Bamako"], lng: -4, lat: 17.6 },
  { iso2: "RW", name: "Rwanda", aliases: ["Rwanda", "Kigali"], lng: 29.9, lat: -1.9 },
  { iso2: "MA", name: "Morocco", aliases: ["Morocco", "Rabat"], lng: -6.3, lat: 31.8 },
  { iso2: "IE", name: "Ireland", aliases: ["Ireland", "Dublin"], lng: -8, lat: 53.2 },
  { iso2: "DK", name: "Denmark", aliases: ["Denmark", "Greenland", "Copenhagen"], lng: 9.5, lat: 56 },
  { iso2: "GL", name: "Greenland", aliases: ["Greenland", "Nuuk"], lng: -41, lat: 71.7 },
  { iso2: "TH", name: "Thailand", aliases: ["Thailand", "Bangkok"], lng: 100.9, lat: 15.9 },
  { iso2: "VN", name: "Vietnam", aliases: ["Vietnam", "Viet Nam", "Hanoi"], lng: 108.3, lat: 14.1 },
  { iso2: "PH", name: "Philippines", aliases: ["Philippines", "Manila"], lng: 121.8, lat: 12.9 },
  { iso2: "MY", name: "Malaysia", aliases: ["Malaysia", "Kuala Lumpur"], lng: 101.9, lat: 4.2 },
  { iso2: "NG", name: "Nigeria", aliases: ["Nigeria", "Lagos", "Abuja"], lng: 8.7, lat: 9.1 },
  { iso2: "EG", name: "Egypt", aliases: ["Egypt", "Cairo"], lng: 30.8, lat: 26.8 },
];

export interface GeoResolution {
  geoCode: string;      // country tier: ISO2; sub-tiers: ISO2:Name (until polygons land)
  lng: number;
  lat: number;
  matchedName: string;
}

const normalize = (s: string) => s.trim().toLowerCase();

/** Resolve a placeName to a country entry by name or alias (exact match). */
export function resolveCountry(placeName: string): CountryEntry | null {
  const p = normalize(placeName);
  for (const c of COUNTRIES) {
    if (normalize(c.name) === p) return c;
    for (const a of c.aliases) {
      if (normalize(a) === p) return c;
    }
  }
  // substring pass (e.g. "eastern Ukraine" → Ukraine) — longest name wins
  let best: CountryEntry | null = null;
  let bestLen = 0;
  for (const c of COUNTRIES) {
    const names = [c.name, ...c.aliases].map(normalize);
    for (const nm of names) {
      if (p.includes(nm) && nm.length > bestLen) {
        best = c;
        bestLen = nm.length;
      }
    }
  }
  return best;
}

/**
 * Resolve a place to a geoCode. Country tier → direct entry.
 * Sub-country tiers: if place matches a known alias of a country, resolve to it
 * (e.g. "Tokyo" → JP). Unknown sub-country places → null (review queue).
 */
export function resolvePlace(placeName: string, _tier: string): GeoResolution | null {
  const hit = resolveCountry(placeName);
  if (!hit) return null;
  return {
    geoCode: hit.iso2,
    lng: hit.lng,
    lat: hit.lat,
    matchedName: hit.name,
  };
}

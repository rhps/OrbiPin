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
  { iso2: "US", name: "United States", aliases: ["US", "USA", "America", "United States of America"], lng: -77.04, lat: 38.9 },
  { iso2: "GB", name: "United Kingdom", aliases: ["UK", "Britain", "Great Britain", "England"], lng: -0.13, lat: 51.51 },
  { iso2: "FR", name: "France", aliases: ["France"], lng: 2.35, lat: 48.86 },
  { iso2: "DE", name: "Germany", aliases: ["Germany"], lng: 13.4, lat: 52.52 },
  { iso2: "RU", name: "Russia", aliases: ["Russia", "Russian Federation"], lng: 37.62, lat: 55.76 },
  { iso2: "QA", name: "Qatar", aliases: ["Qatar"], lng: 51.53, lat: 25.29 },
  { iso2: "JP", name: "Japan", aliases: ["Japan"], lng: 139.69, lat: 35.69 },
  { iso2: "KR", name: "South Korea", aliases: ["South Korea", "Korea", "Republic of Korea"], lng: 126.98, lat: 37.57 },
  { iso2: "AU", name: "Australia", aliases: ["Australia"], lng: 149.13, lat: -35.28 },
  { iso2: "SG", name: "Singapore", aliases: ["Singapore"], lng: 103.82, lat: 1.35 },
  { iso2: "ID", name: "Indonesia", aliases: ["Indonesia"], lng: 106.85, lat: -6.21 },
  { iso2: "PK", name: "Pakistan", aliases: ["Pakistan"], lng: 73.05, lat: 33.69 },
  { iso2: "CN", name: "China", aliases: ["China", "PRC"], lng: 116.4, lat: 39.9 },
  { iso2: "IN", name: "India", aliases: ["India"], lng: 77.21, lat: 28.61 },
  { iso2: "BR", name: "Brazil", aliases: ["Brazil"], lng: -47.93, lat: -15.78 },
  { iso2: "MX", name: "Mexico", aliases: ["Mexico"], lng: -99.13, lat: 19.43 },
  { iso2: "ZA", name: "South Africa", aliases: ["South Africa"], lng: 28.19, lat: -25.75 },
  { iso2: "TR", name: "Türkiye", aliases: ["Turkey", "Türkiye"], lng: 32.85, lat: 39.93 },
  { iso2: "UA", name: "Ukraine", aliases: ["Ukraine"], lng: 30.52, lat: 50.45 },
  { iso2: "IL", name: "Israel", aliases: ["Israel"], lng: 35.21, lat: 31.77 },
  { iso2: "PS", name: "Palestine", aliases: ["Palestine"], lng: 35.2, lat: 31.9 },
  { iso2: "TW", name: "Taiwan", aliases: ["Taiwan"], lng: 121.56, lat: 25.03 },
  { iso2: "KP", name: "North Korea", aliases: ["North Korea", "DPRK"], lng: 125.75, lat: 39.03 },
  { iso2: "IR", name: "Iran", aliases: ["Iran"], lng: 51.39, lat: 35.69 },
  { iso2: "SA", name: "Saudi Arabia", aliases: ["Saudi Arabia"], lng: 46.68, lat: 24.71 },
  { iso2: "YE", name: "Yemen", aliases: ["Yemen"], lng: 44.21, lat: 15.37 },
  { iso2: "ET", name: "Ethiopia", aliases: ["Ethiopia"], lng: 38.75, lat: 9.02 },
  { iso2: "DJ", name: "Djibouti", aliases: ["Djibouti"], lng: 43.15, lat: 11.59 },
  { iso2: "ML", name: "Mali", aliases: ["Mali"], lng: -8.0, lat: 12.65 },
  { iso2: "RW", name: "Rwanda", aliases: ["Rwanda"], lng: 30.06, lat: -1.94 },
  { iso2: "MA", name: "Morocco", aliases: ["Morocco"], lng: -6.85, lat: 34.02 },
  { iso2: "IE", name: "Ireland", aliases: ["Ireland"], lng: -6.26, lat: 53.35 },
  { iso2: "DK", name: "Denmark", aliases: ["Denmark"], lng: 12.57, lat: 55.68 },
  { iso2: "GL", name: "Greenland", aliases: ["Greenland"], lng: -51.72, lat: 64.18 },
  { iso2: "TH", name: "Thailand", aliases: ["Thailand"], lng: 100.5, lat: 13.76 },
  { iso2: "VN", name: "Vietnam", aliases: ["Vietnam", "Viet Nam"], lng: 105.83, lat: 21.03 },
  { iso2: "PH", name: "Philippines", aliases: ["Philippines"], lng: 120.98, lat: 14.6 },
  { iso2: "MY", name: "Malaysia", aliases: ["Malaysia"], lng: 101.69, lat: 3.14 },
  { iso2: "NG", name: "Nigeria", aliases: ["Nigeria"], lng: 7.49, lat: 9.06 },
  { iso2: "EG", name: "Egypt", aliases: ["Egypt"], lng: 31.24, lat: 30.04 },
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

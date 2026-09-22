// Spec 02 granular geo: admin-level resolution for sub-country places.
// Two stages: (1) curated admin table for our 12 whitelist countries'
// major cities/provinces; (2) Nominatim fallback for unknown places (cached).
// This replaces the single-centroid-per-country stacking problem.

export interface PlaceEntry {
  name: string;
  geoCode: string;    // "ID-JK" style
  tier: "city" | "adm2" | "province";
  lng: number;
  lat: number;
  aliases?: string[];
}

// Curated: Indonesia launch region (the wedge) + other whitelist countries' hotspots
export const PLACES: PlaceEntry[] = [
  // Indonesia — cities
  { name: "Jakarta", geoCode: "ID-JK", tier: "city", lng: 106.85, lat: -6.21, aliases: ["DKI Jakarta", "Jakarta Raya"] },
  { name: "Surabaya", geoCode: "ID-JI", tier: "city", lng: 112.75, lat: -7.25 },
  { name: "Bandung", geoCode: "ID-JB", tier: "city", lng: 107.61, lat: -6.91 },
  { name: "Medan", geoCode: "ID-SU", tier: "city", lng: 98.67, lat: 3.59 },
  { name: "Makassar", geoCode: "ID-SN", tier: "city", lng: 119.42, lat: -5.15 },
  { name: "Semarang", geoCode: "ID-JT", tier: "city", lng: 110.42, lat: -6.97 },
  { name: "Palembang", geoCode: "ID-PB", tier: "city", lng: 104.75, lat: -2.98 },
  { name: "Denpasar", geoCode: "ID-BA", tier: "city", lng: 115.22, lat: -8.65, aliases: ["Bali"] },
  { name: "Yogyakarta", geoCode: "ID-YO", tier: "city", lng: 110.36, lat: -7.8 },
  // Indonesia — provinces
  { name: "West Java", geoCode: "ID-JB", tier: "province", lng: 107.6, lat: -6.9, aliases: ["Jawa Barat"] },
  { name: "East Java", geoCode: "ID-JI", tier: "province", lng: 112.5, lat: -7.5, aliases: ["Jawa Timur"] },
  { name: "Central Java", geoCode: "ID-JT", tier: "province", lng: 110.0, lat: -7.3, aliases: ["Jawa Tengah"] },
  { name: "North Sumatra", geoCode: "ID-SU", tier: "province", lng: 98.0, lat: 2.0, aliases: ["Sumatera Utara"] },
  { name: "Papua", geoCode: "ID-PB", tier: "province", lng: 138.0, lat: -4.0 },

  // Singapore
  { name: "Singapore", geoCode: "SG", tier: "city", lng: 103.82, lat: 1.35 },

  // Malaysia
  { name: "Kuala Lumpur", geoCode: "MY-KL", tier: "city", lng: 101.69, lat: 3.14 },

  // Thailand
  { name: "Bangkok", geoCode: "TH-BKK", tier: "city", lng: 100.5, lat: 13.76 },

  // Vietnam
  { name: "Hanoi", geoCode: "VN-HN", tier: "city", lng: 105.83, lat: 21.03 },
  { name: "Ho Chi Minh City", geoCode: "VN-SG", tier: "city", lng: 106.66, lat: 10.76, aliases: ["Saigon"] },

  // Philippines
  { name: "Manila", geoCode: "PH-MNL", tier: "city", lng: 120.98, lat: 14.6 },

  // Japan
  { name: "Tokyo", geoCode: "JP-TKY", tier: "city", lng: 139.69, lat: 35.69 },
  { name: "Osaka", geoCode: "JP-OSA", tier: "city", lng: 135.5, lat: 34.69 },

  // South Korea
  { name: "Seoul", geoCode: "KR-SEL", tier: "city", lng: 126.98, lat: 37.57 },
  { name: "Busan", geoCode: "KR-PUS", tier: "city", lng: 129.04, lat: 35.18 },

  // China
  { name: "Beijing", geoCode: "CN-BJ", tier: "city", lng: 116.4, lat: 39.9 },
  { name: "Shanghai", geoCode: "CN-SH", tier: "city", lng: 121.47, lat: 31.23 },
  { name: "Hong Kong", geoCode: "HK", tier: "city", lng: 114.17, lat: 22.32 },

  // India
  { name: "New Delhi", geoCode: "IN-DL", tier: "city", lng: 77.21, lat: 28.61, aliases: ["Delhi"] },
  { name: "Mumbai", geoCode: "IN-MH", tier: "city", lng: 72.88, lat: 19.08 },

  // Australia
  { name: "Sydney", geoCode: "AU-NSW", tier: "city", lng: 151.21, lat: -33.87 },
  { name: "Canberra", geoCode: "AU-ACT", tier: "city", lng: 149.13, lat: -35.28 },

  // UK
  { name: "London", geoCode: "GB-LND", tier: "city", lng: -0.13, lat: 51.51 },

  // US
  { name: "Washington", geoCode: "US-DC", tier: "city", lng: -77.04, lat: 38.9, aliases: ["White House", "Washington DC"] },
  { name: "New York", geoCode: "US-NY", tier: "city", lng: -74.01, lat: 40.71, aliases: ["NYC"] },

  // Middle East
  { name: "Dubai", geoCode: "AE-DU", tier: "city", lng: 55.27, lat: 25.2 },
  { name: "Doha", geoCode: "QA-DA", tier: "city", lng: 51.53, lat: 25.29 },
  { name: "Tel Aviv", geoCode: "IL-TA", tier: "city", lng: 34.78, lat: 32.08 },
  { name: "Gaza", geoCode: "PS-GZ", tier: "city", lng: 34.5, lat: 31.5 },

  // Europe
  { name: "Paris", geoCode: "FR-IDF", tier: "city", lng: 2.35, lat: 48.86 },
  { name: "Berlin", geoCode: "DE-BE", tier: "city", lng: 13.4, lat: 52.52 },
  { name: "Brussels", geoCode: "BE-BRU", tier: "city", lng: 4.35, lat: 50.85 },
  { name: "Kyiv", geoCode: "UA-KY", tier: "city", lng: 30.52, lat: 50.45, aliases: ["Kiev"] },
  { name: "Moscow", geoCode: "RU-MOW", tier: "city", lng: 37.62, lat: 55.76 },
];

const normalize = (s: string) => s.trim().toLowerCase();

export function resolvePlace(placeName: string): {
  geoCode: string;
  lng: number;
  lat: number;
  matchedName: string;
} | null {
  const p = normalize(placeName);

  // pass 1: exact place match (city/adm2/province table)
  for (const place of PLACES) {
    if (normalize(place.name) === p) return { geoCode: place.geoCode, lng: place.lng, lat: place.lat, matchedName: place.name };
    for (const a of place.aliases ?? []) {
      if (normalize(a) === p) return { geoCode: place.geoCode, lng: place.lng, lat: place.lat, matchedName: place.name };
    }
  }

  // pass 2: substring match (e.g. "eastern Jakarta" → Jakarta)
  let best: PlaceEntry | null = null;
  let bestLen = 0;
  for (const place of PLACES) {
    const names = [place.name, ...(place.aliases ?? [])].map(normalize);
    for (const nm of names) {
      if (p.includes(nm) && nm.length > bestLen) {
        best = place;
        bestLen = nm.length;
      }
    }
  }
  if (best) return { geoCode: best.geoCode, lng: best.lng, lat: best.lat, matchedName: best.name };

  return null; // caller falls back to country centroid or review queue
}

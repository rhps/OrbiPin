// Feature C: timezone → likely-home region (auth-free, privacy-safe).
// Timezone string ONLY — no IP lookup, no geolocation prompt, no third-party API.
export interface RegionGuess { geoCode: string; label: string }

// ISO2 geoCodes (events use ISO2) + display names
const TZ_MAP: Record<string, RegionGuess> = {
  // Indonesia / SEA wedge
  "Asia/Jakarta": { geoCode: "ID", label: "Indonesia" },
  "Asia/Makassar": { geoCode: "ID", label: "Indonesia" },
  "Asia/Jayapura": { geoCode: "ID", label: "Indonesia" },
  "Asia/Pontianak": { geoCode: "ID", label: "Indonesia" },
  "Asia/Singapore": { geoCode: "SG", label: "Singapore" },
  "Asia/Kuala_Lumpur": { geoCode: "MY", label: "Malaysia" },
  "Asia/Kuching": { geoCode: "MY", label: "Malaysia" },
  "Asia/Bangkok": { geoCode: "TH", label: "Thailand" },
  "Asia/Manila": { geoCode: "PH", label: "Philippines" },
  "Asia/Ho_Chi_Minh": { geoCode: "VN", label: "Vietnam" },
  // UK / Europe
  "Europe/London": { geoCode: "GB", label: "the UK" },
  "Europe/Dublin": { geoCode: "GB", label: "the UK" },
  "Europe/Paris": { geoCode: "FR", label: "France" },
  "Europe/Berlin": { geoCode: "DE", label: "Germany" },
  "Europe/Madrid": { geoCode: "ES", label: "Spain" },
  "Europe/Rome": { geoCode: "IT", label: "Italy" },
  "Europe/Amsterdam": { geoCode: "NL", label: "the Netherlands" },
  "Europe/Brussels": { geoCode: "BE", label: "Belgium" },
  "Europe/Warsaw": { geoCode: "PL", label: "Poland" },
  "Europe/Stockholm": { geoCode: "SE", label: "Sweden" },
  "Europe/Oslo": { geoCode: "NO", label: "Norway" },
  "Europe/Lisbon": { geoCode: "PT", label: "Portugal" },
  "Europe/Zurich": { geoCode: "CH", label: "Switzerland" },
  "Europe/Athens": { geoCode: "GR", label: "Greece" },
  // Americas
  "America/New_York": { geoCode: "US", label: "the US" },
  "America/Chicago": { geoCode: "US", label: "the US" },
  "America/Denver": { geoCode: "US", label: "the US" },
  "America/Los_Angeles": { geoCode: "US", label: "the US" },
  "America/Anchorage": { geoCode: "US", label: "the US" },
  "America/Sao_Paulo": { geoCode: "BR", label: "Brazil" },
  "America/Argentina/Buenos_Aires": { geoCode: "AR", label: "Argentina" },
  "America/Mexico_City": { geoCode: "MX", label: "Mexico" },
  "America/Toronto": { geoCode: "CA", label: "Canada" },
  "America/Vancouver": { geoCode: "CA", label: "Canada" },
  "Asia/Tokyo": { geoCode: "JP", label: "Japan" },
  "Asia/Seoul": { geoCode: "KR", label: "South Korea" },
  "Asia/Shanghai": { geoCode: "CN", label: "China" },
  "Asia/Hong_Kong": { geoCode: "HK", label: "Hong Kong" },
  "Asia/Taipei": { geoCode: "TW", label: "Taiwan" },
  "Asia/Kolkata": { geoCode: "IN", label: "India" },
  "Australia/Sydney": { geoCode: "AU", label: "Australia" },
  "Africa/Johannesburg": { geoCode: "ZA", label: "South Africa" },
  "Africa/Cairo": { geoCode: "EG", label: "Egypt" },
  "Africa/Nairobi": { geoCode: "KE", label: "Kenya" },
};

export function detectRegion(): RegionGuess | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_MAP[tz] ?? null; // no match → show nothing (default-off)
  } catch {
    return null;
  }
}

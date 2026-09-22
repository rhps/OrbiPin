// Event shape — the contract between ingestion, DB, and map (G1/G3/G5).
// A Source is a single article attesting to an event.

export type PrecisionTier = "city" | "adm2" | "province" | "country";

export interface Source {
  url: string;
  publisher: string;
  title: string;
  publishedAt: number; // epoch ms
}

export interface GeoLocation {
  placeName: string;
  tier: PrecisionTier;
  /** ISO-ish code resolving via the boundary lookup (G2): "ID-JB", "TLS", "ID-JK" */
  geoCode: string;
  /** city tier: point pin; others: polygon via lookup */
  lng?: number;
  lat?: number;
}

export interface EventFeature extends GeoLocation {
  _id: string;
  event: string; // hedged label rendered as "Reports of …" (G5)
  quotedPhrase: string; // verbatim from the article (G1) — mandatory
  severity: number; // 1–5, from extraction
  sources: Source[]; // G5: must be non-empty (compile + runtime enforced)
  storyClusterId?: string;
  lastSeenAt: number; // G4 staleness paint
  occurredAt: number; // first seen
  archived?: boolean; // G4: unseen ≥7 days
  provenance?: "crawl" | "rss-inlet" | "gdelt-backfill";
}

// Type-level G5: sources must be a non-empty array.
export type ValidatedEvent = Omit<EventFeature, "sources"> & {
  sources: [Source, ...Source[]];
};

export function assertNonEmptySources(sources: Source[]): asserts sources is [Source, ...Source[]] {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error("G5 violation: event has zero sources");
  }
}

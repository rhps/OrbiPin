// Demo events for the sandbox graduate — replaced by the Convex live query
// when the deployment is wired. Same shape as the real EventFeature.
import type { EventFeature } from "./types";

const now = Date.now();
const H = 3600_000;

export const demoEvents: EventFeature[] = [
  {
    _id: "demo-1",
    event: "Flooding report",
    tier: "city",
    placeName: "Jakarta",
    geoCode: "ID-JK",
    lng: 106.8456,
    lat: -6.2088,
    quotedPhrase: "floods inundated parts of Jakarta",
    severity: 3,
    sources: [
      {
        url: "https://example.com/jakarta-floods",
        publisher: "Demo Wire",
        title: "Floods inundate parts of Jakarta",
        publishedAt: now - 2 * H,
      },
    ],
    storyClusterId: "demo-flood",
    lastSeenAt: now - H,
    occurredAt: now - 3 * H,
    provenance: "crawl",
  },
  {
    _id: "demo-2",
    event: "High winds damage farms",
    tier: "province",
    placeName: "West Java",
    geoCode: "ID-JB",
    quotedPhrase: "across West Java province",
    severity: 2,
    sources: [
      {
        url: "https://example.com/west-java-winds",
        publisher: "Demo Daily",
        title: "Winds damage farms across West Java",
        publishedAt: now - 5 * H,
      },
    ],
    lastSeenAt: now - 2 * H,
    occurredAt: now - 6 * H,
    provenance: "crawl",
  },
  {
    _id: "demo-3",
    event: "Country-wide storm warning",
    tier: "country",
    placeName: "Timor-Leste",
    geoCode: "TLS",
    quotedPhrase: "across Timor-Leste",
    severity: 2,
    sources: [
      {
        url: "https://example.com/timor-storm",
        publisher: "Demo Herald",
        title: "Storm warning across Timor-Leste",
        publishedAt: now - 8 * H,
      },
    ],
    lastSeenAt: now - 3 * H,
    occurredAt: now - 9 * H,
    provenance: "crawl",
  },
];

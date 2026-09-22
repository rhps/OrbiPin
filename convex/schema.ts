import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    event: v.string(), // hedged label; rendered as "Reports of …" (G5)
    placeName: v.string(),
    tier: v.union(v.literal("city"), v.literal("adm2"), v.literal("province"), v.literal("country")),
    geoCode: v.string(), // G2: boundary lookup key ("ID-JB", "TLS", …)
    lng: v.optional(v.number()),
    lat: v.optional(v.number()),
    quotedPhrase: v.string(), // G1: verbatim from source article
    severity: v.number(),
    storyClusterId: v.optional(v.string()),
    lastSeenAt: v.number(), // G4
    occurredAt: v.number(),
    archived: v.boolean(), // G4
    provenance: v.union(v.literal("crawl"), v.literal("rss-inlet"), v.literal("gdelt-backfill")),
    searchText: v.optional(v.string()), // spec 12: derived (optional during backfill; always written on new events)
  })
    .index("by_archived", ["archived"])
    .index("by_geoCode", ["geoCode"])
    .index("by_cluster", ["storyClusterId"])
    .index("by_lastSeenAt", ["lastSeenAt"])
    .searchIndex("search_events", {
      searchField: "searchText",
      filterFields: ["tier", "archived", "geoCode", "lastSeenAt"],
    }),

  articles: defineTable({
    url: v.string(),
    publisher: v.string(),
    title: v.string(),
    publishedAt: v.number(),
    eventId: v.id("events"),
  })
    .index("by_event", ["eventId"])
    .index("by_url", ["url"]),

  // story clusters: G3 dedup grouping (one story = one pin)
  storyClusters: defineTable({
    storyClusterId: v.string(),
    headEventId: v.id("events"),
    updatedAt: v.number(),
  }).index("by_clusterId", ["storyClusterId"]),

  // spec 06: raw feed items pending extraction (the crawl staging area)
  rawItems: defineTable({
    url: v.string(),
    title: v.string(),
    publishedAt: v.number(),
    sourceId: v.string(),
    country: v.optional(v.string()), // extraction needs the country to resolve geo codes
    stateMedia: v.optional(v.boolean()),
    state: v.string(), // pending-extraction | ingested | skipped-not-significant | rejected-g1 | needs-geo-review | extraction-failed
    seenAt: v.number(),
    lastSeenAt: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_url", ["url"])
    .index("by_state", ["state"]),

  // spec 05: region followers (AgentMail address IS the identity)
  followers: defineTable({
    address: v.string(),
    tier: v.union(v.literal("city"), v.literal("adm2"), v.literal("province"), v.literal("country")),
    geoCode: v.string(),
    cadence: v.union(v.literal("instant"), v.literal("daily"), v.literal("weekly")),
    breakingOptIn: v.boolean(),
    timezone: v.string(),
  })
    .index("by_address", ["address"])
    .index("by_geoCode", ["geoCode"]),

  // spec 05: story follows
  storyFollows: defineTable({
    address: v.string(),
    storyClusterId: v.string(),
  })
    .index("by_cluster", ["storyClusterId"])
    .index("by_address", ["address"]),

  // spec 09: timeline ("on this day" + scrubber)
  timelineMeta: defineTable({
    eventId: v.id("events"),
    occurredOn: v.string(), // YYYY-MM-DD for on-this-day queries
  }).index("by_occurredOn", ["occurredOn"]),
});

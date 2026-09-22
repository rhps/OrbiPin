// Spec 03: events → GeoJSON for the map. Joins events + articles, applies
// G4 staleness filtering, G5 source validation.
import { query } from "./_generated/server";

export const activeEventsGeo = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();
    const features: any[] = [];
    for (const ev of events) {
      if (ev.lng === undefined || ev.lat === undefined) continue; // polygon tiers land with spec 02 polygons
      const arts = await ctx.db
        .query("articles")
        .withIndex("by_event", (q) => q.eq("eventId", ev._id))
        .collect();
      if (arts.length === 0) continue; // G5 runtime guard
      const newest = arts.slice().sort((a, b) => b.publishedAt - a.publishedAt)[0];
      features.push({
        type: "Feature",
        id: Number(ev._id.slice(-8).replace(/\D/g, "")) || Math.floor(Math.random() * 1e8),
        properties: {
          id: ev._id,
          event: ev.event,
          tier: ev.tier,
          place: ev.placeName,
          geoCode: ev.geoCode,
          quoted: ev.quotedPhrase,
          severity: ev.severity,
          sourceCount: arts.length,
          lastSeenAt: ev.lastSeenAt,
          latestTitle: newest.title,
          latestPublisher: newest.publisher,
          latestUrl: newest.url,
          latestPublishedAt: newest.publishedAt || 0,
        },
        geometry: { type: "Point", coordinates: [ev.lng, ev.lat] },
      });
    }
    return { type: "FeatureCollection", features };
  },
});

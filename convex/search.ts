// spec 12: full-text search — relevance-ranked, filtered, paginated.
import { query } from "./_generated/server";
import { v } from "convex/values";

export const searchEvents = query({
  args: {
    q: v.string(),
    tier: v.optional(v.string()),
    geoCode: v.optional(v.string()),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = args.q.trim();
    if (!q) return { results: [], total: 0, page: 0 };
    const page = args.page ?? 0;
    // searchIndex relevance-ranks; take a page of 20
    const hits = await ctx.db
      .query("events")
      .withSearchIndex("search_events", (s) => {
        let f = s.search("searchText", q).eq("archived", false);
        if (args.tier) f = f.eq("tier", args.tier as any);
        if (args.geoCode) f = f.eq("geoCode", args.geoCode as any);
        return f;
      })
      .take(20 * (page + 1));
    const slice = hits.slice(page * 20, page * 20 + 20);
    return {
      results: slice.map((ev) => ({
        _id: ev._id,
        event: ev.event,
        tier: ev.tier,
        placeName: ev.placeName,
        geoCode: ev.geoCode,
        quotedPhrase: ev.quotedPhrase,
        lastSeenAt: ev.lastSeenAt,
        lng: ev.lng,
        lat: ev.lat,
      })),
      total: hits.length,
      page,
    };
  },
});

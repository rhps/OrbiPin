// Feature B: per-region transparency stats — one query, two consumers (panel + gate).
import { query } from "./_generated/server";
import { v } from "convex/values";

export const regionStats = query({
  args: { geoCode: v.string() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_geoCode", (q) => q.eq("geoCode", args.geoCode))
      .collect();

    const live = events.filter((e) => !e.archived);
    const archived = events.filter((e) => e.archived);

    // distinct publishers across the region's articles
    // articles by event: fetch via index per event (bounded by region size)
    const publishers = new Set<string>();
    let newestArticleAt = 0;
    for (const ev of live.slice(0, 50)) {
      const arts = await ctx.db
        .query("articles")
        .withIndex("by_event", (q) => q.eq("eventId", ev._id))
        .collect();
      for (const a of arts) {
        publishers.add(a.publisher);
        if (a.publishedAt > newestArticleAt) newestArticleAt = a.publishedAt;
      }
    }

    // precision mix (tier) — the honesty signal
    const tiers = { city: 0, adm2: 0, province: 0, country: 0 };
    for (const ev of events) {
      if (ev.tier in tiers) tiers[ev.tier as keyof typeof tiers]++;
    }

    return {
      geoCode: args.geoCode,
      totalEvents: events.length,
      liveEvents: live.length,
      archivedEvents: archived.length,
      distinctPublishers: publishers.size,
      newestArticleAt,
      tiers,
    };
  },
});

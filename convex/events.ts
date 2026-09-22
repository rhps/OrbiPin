// Events write/read path — G1–G5 gates live here.
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Source } from "../src/types";

export const upsertEvent = internalMutation({
  args: {
    placeName: v.string(),
    tier: v.union(v.literal("city"), v.literal("adm2"), v.literal("province"), v.literal("country")),
    geoCode: v.string(),
    lng: v.optional(v.number()),
    lat: v.optional(v.number()),
    event: v.string(),
    quotedPhrase: v.string(),
    severity: v.number(),
    article: v.object({
      url: v.string(),
      publisher: v.string(),
      title: v.string(),
      publishedAt: v.number(),
    }),
    storyClusterId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const newSource: Source = {
      url: args.article.url,
      publisher: args.article.publisher,
      title: args.article.title,
      publishedAt: args.article.publishedAt,
    };

    // G3 dedup: find an existing open event matching cluster id, or same
    // geoCode + very similar event label within 48h.
    if (args.storyClusterId) {
      const clusterEvents = await ctx.db
        .query("events")
        .withIndex("by_cluster", (q) => q.eq("storyClusterId", args.storyClusterId!))
        .filter((q) => q.eq(q.field("archived"), false))
        .collect();
      if (clusterEvents.length > 0) {
        const ev = clusterEvents[0];
        await ctx.db.patch(ev._id, { lastSeenAt: now });
        await ctx.db.insert("articles", { ...args.article, eventId: ev._id });
        return { attachedTo: ev._id };
      }
    }
    const candidates = await ctx.db
      .query("events")
      .withIndex("by_geoCode", (q) => q.eq("geoCode", args.geoCode))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
    const match = candidates.find(
      (ev) =>
        now - ev.lastSeenAt <= 48 * 3600_000 &&
        ev.event.toLowerCase().slice(0, 24) === args.event.toLowerCase().slice(0, 24)
    );
    if (match) {
      await ctx.db.patch(match._id, { lastSeenAt: now });
      await ctx.db.insert("articles", { ...args.article, eventId: match._id });
      return { attachedTo: match._id };
    }

    // genuinely new event — G5: first source makes sources non-empty at read time
    const eventId = await ctx.db.insert("events", {
      event: args.event,
      placeName: args.placeName,
      tier: args.tier,
      geoCode: args.geoCode,
      lng: args.lng,
      lat: args.lat,
      quotedPhrase: args.quotedPhrase,
      severity: args.severity,
      storyClusterId: args.storyClusterId,
      lastSeenAt: now,
      occurredAt: now,
      archived: false,
      provenance: "crawl",
    });
    await ctx.db.insert("articles", { ...args.article, eventId });
    return { created: eventId };
  },
});

// Read: events with their sources, G5-validated (zero-source events never surface)
export const listActiveWithSources = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();
    const out = [];
    for (const ev of events) {
      const arts = await ctx.db
        .query("articles")
        .withIndex("by_event", (q) => q.eq("eventId", ev._id))
        .collect();
      if (arts.length === 0) continue; // G5 runtime guard
      const sources = arts
        .map((a) => ({ url: a.url, publisher: a.publisher, title: a.title, publishedAt: a.publishedAt }))
        .sort((a, b) => b.publishedAt - a.publishedAt);
      out.push({ ...ev, sources });
    }
    return out;
  },
});

// G4: archive events unseen for 7 days (cron target)
export const archiveStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 7 * 24 * 3600_000;
    const stale = await ctx.db
      .query("events")
      .withIndex("by_lastSeenAt", (q) => q.lt("lastSeenAt", cutoff))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
    for (const ev of stale) await ctx.db.patch(ev._id, { archived: true });
    return { archived: stale.length };
  },
});

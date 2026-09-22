import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ---------- Events table shape lives in schema.ts ----------

// Live query: all non-archived events (map consumes as GeoJSON client-side)
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("events").withIndex("by_archived", (q) => q.eq("archived", false)).collect();
  },
});

// ---------- Ingestion write path (G1/G2/G3/G5 gates) ----------

const articleArgs = v.object({
  url: v.string(),
  publisher: v.string(),
  title: v.string(),
  publishedAt: v.number(),
});

export const ingestArticle = internalAction({
  args: {
    placeName: v.string(),
    tier: v.union(v.literal("city"), v.literal("adm2"), v.literal("province"), v.literal("country")),
    geoCode: v.string(),
    lng: v.optional(v.number()),
    lat: v.optional(v.number()),
    event: v.string(),
    quotedPhrase: v.string(),
    articleText: v.string(), // for G1 verbatim verification
    severity: v.number(),
    article: articleArgs,
    storyClusterId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // G1: quotedPhrase must exist verbatim in the article text
    if (!args.articleText.includes(args.quotedPhrase)) {
      return { accepted: false, reason: "G1: quotedPhrase not found verbatim in article" };
    }
    // G5 pre-check: article itself is a source, so sources can never be empty
    await ctx.runMutation(internal.events.upsertEvent, {
      placeName: args.placeName,
      tier: args.tier,
      geoCode: args.geoCode,
      lng: args.lng,
      lat: args.lat,
      event: args.event,
      quotedPhrase: args.quotedPhrase,
      severity: args.severity,
      article: args.article,
      storyClusterId: args.storyClusterId,
    });
    return { accepted: true };
  },
});

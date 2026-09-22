// Spec 05: follower queries used by alerts.ts
import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const followersForGeo = internalQuery({
  args: { geoCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("followers")
      .withIndex("by_geoCode", (q) => q.eq("geoCode", args.geoCode))
      .collect();
  },
});

export const allDigestFollowers = internalQuery({
  args: { kind: v.union(v.literal("daily"), v.literal("weekly")) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("followers").collect();
    // daily cadence maps to "daily" kind; weekly to "weekly"
    return all.filter((f) =>
      args.kind === "weekly" ? f.cadence === "weekly" : f.cadence === "daily" || f.cadence === "instant"
    );
  },
});

// Spec 05: public mutations for the Habit Loop UI.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Register/update a follower: email + region + cadence
export const followRegion = mutation({
  args: {
    address: v.string(),
    tier: v.union(v.literal("city"), v.literal("adm2"), v.literal("province"), v.literal("country")),
    geoCode: v.string(),
    cadence: v.union(v.literal("instant"), v.literal("daily"), v.literal("weekly")),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const address = args.address.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
      throw new Error("Invalid email address");
    }
    const existing = await ctx.db
      .query("followers")
      .withIndex("by_address", (q) => q.eq("address", address))
      .filter((q) => q.eq(q.field("geoCode"), args.geoCode))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { cadence: args.cadence, timezone: args.timezone });
      return { updated: true, id: existing._id };
    }
    const id = await ctx.db.insert("followers", {
      address,
      tier: args.tier,
      geoCode: args.geoCode,
      cadence: args.cadence,
      breakingOptIn: false,
      timezone: args.timezone,
    });
    return { created: true, id };
  },
});

// Unfollow a region
export const unfollowRegion = mutation({
  args: { address: v.string(), geoCode: v.string() },
  handler: async (ctx, args) => {
    const address = args.address.trim().toLowerCase();
    const rows = await ctx.db
      .query("followers")
      .withIndex("by_address", (q) => q.eq("address", address))
      .filter((q) => q.eq(q.field("geoCode"), args.geoCode))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return { removed: rows.length };
  },
});

// List a follower's current follows (for the manage panel)
export const listMyFollows = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const address = args.address.trim().toLowerCase();
    return await ctx.db
      .query("followers")
      .withIndex("by_address", (q) => q.eq("address", address))
      .collect();
  },
});

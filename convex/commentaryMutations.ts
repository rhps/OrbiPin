// Commentary mutations: seeds + inbound (Part A) + list for card/map.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_BODY = 280;

export const addSeed = mutation({
  args: { eventId: v.id("events"), body: v.string(), authorLabel: v.string() },
  handler: async (ctx, args) => {
    if (args.body.length > MAX_BODY) throw new Error("commentary body > 280 chars");
    return await ctx.db.insert("commentary", {
      eventId: args.eventId,
      body: args.body,
      authorLabel: args.authorLabel,
      receivedAt: Date.now(),
      verified: false,
      seeded: true,
      autoApproved: true, // seeds are pre-vetted copy, displayable
    });
  },
});

// inbound (Part A): stored unverified, auto-approved only if lightweight checks pass
export const addInbound = mutation({
  args: {
    eventId: v.optional(v.id("events")),
    body: v.string(),
    authorLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const body = args.body.trim().slice(0, MAX_BODY);
    const hasUrl = /https?:\/\//i.test(body);
    const hasPhone = /(\+?\d[\d\s-]{7,})/.test(body);
    const autoApproved = !hasUrl && !hasPhone && body.length >= 10;
    return await ctx.db.insert("commentary", {
      eventId: args.eventId ?? ("00000000000000000000000000000000" as any), // queued if no match
      body,
      authorLabel: args.authorLabel,
      receivedAt: Date.now(),
      verified: false,
      autoApproved,
    });
  },
});

// display: only auto-approved, with event resolved for the card
export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) =>
    ctx.db
      .query("commentary")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("autoApproved"), true))
      .collect(),
});

// map data: counts per event for the pin badge
export const countsForEvents = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("commentary").collect();
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.autoApproved) counts[r.eventId] = (counts[r.eventId] ?? 0) + 1;
    }
    return counts;
  },
});

// One-off repair: backfill country/stateMedia on rawItems recorded before
// those fields were added. Maps sourceId → country via the whitelist.
import { internalMutation } from "./_generated/server";
import { WHITELIST } from "./sources";
import { resolveCountry } from "./geoLookup";

export const repairRawItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("rawItems").collect();
    let patched = 0;
    for (const item of items) {
      if (item.country !== undefined && item.stateMedia !== undefined) continue;
      const src = WHITELIST.find((s) => s.id === item.sourceId);
      await ctx.db.patch(item._id, {
        country: src?.country ?? "??",
        stateMedia: !!src?.stateMedia,
      });
      patched++;
    }
    return { patched };
  },
});

// G2 migration: move country-tier events from old sea/centroid coords to
// capital-city coords using the geoLookup table. Idempotent — safe to re-run.
export const migrateCountryCoords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    let migrated = 0;
    let skipped = 0;
    for (const ev of events) {
      if (ev.tier !== "country") { skipped++; continue; }
      const hit = resolveCountry(ev.placeName) ?? resolveCountry(ev.geoCode);
      if (!hit) { skipped++; continue; }
      const moved =
        Math.abs((ev.lng ?? 0) - hit.lng) > 0.5 ||
        Math.abs((ev.lat ?? 0) - hit.lat) > 0.5;
      if (!moved) { skipped++; continue; }
      await ctx.db.patch(ev._id, { lng: hit.lng, lat: hit.lat });
      migrated++;
    }
    return { migrated, skipped, total: events.length };
  },
});

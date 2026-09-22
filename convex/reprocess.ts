// G2 review-queue reprocessor: raw items parked in "needs-geo-review" get a
// second chance through the geoLookup table once it lands.
import { internalMutation } from "./_generated/server";
import { resolvePlace } from "./geoLookup";

export const reprocessReviewQueue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("rawItems")
      .withIndex("by_state", (q) => q.eq("state", "needs-geo-review"))
      .collect();
    let resolved = 0;
    let stillUnresolved = 0;
    for (const item of items) {
      // note format was `unresolved place: ${placeName} (${tier})`
      const m = item.note?.match(/unresolved place: (.+) \((\w+)\)/);
      if (!m) { stillUnresolved++; continue; }
      const [, placeName, tier] = m;
      const hit = resolvePlace(placeName, tier);
      if (hit) {
        // stash resolution in note so the extractor picks it up on re-run
        await ctx.db.patch(item._id, {
          state: "pending-extraction",
          note: `resolved:${hit.geoCode}`,
        });
        resolved++;
      } else {
        stillUnresolved++;
      }
    }
    return { total: items.length, resolved, stillUnresolved };
  },
});

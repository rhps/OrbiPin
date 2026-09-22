// One-off repair: backfill country/stateMedia on rawItems recorded before
// those fields were added. Maps sourceId → country via the whitelist.
import { internalMutation } from "./_generated/server";
import { WHITELIST } from "./sources";

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

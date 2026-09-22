// Spec 06 crawl driver: fetch all whitelisted feeds, then extract pending items.
// Called by Convex crons (every 30 min) or manually via `npx convex run`.
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const crawlAllFeeds = internalAction({
  args: {},
  handler: async (ctx) => {
    const results: { sourceId: string; items: number; ok: boolean }[] = [];
    // Sequential to keep rate pressure low; 12 feeds × ~1s ≈ well under a minute.
    for (const id of ["npr", "bbc", "france24", "dw", "aljazeera", "cna", "antara", "japantimes", "koreatimes", "abc-au", "dawn", "tass"]) {
      try {
        const r: any = await ctx.runAction(internal.rss.fetchFeed, { sourceId: id });
        results.push({ sourceId: id, items: r.items ?? 0, ok: !!r.ok });
      } catch (e: any) {
        results.push({ sourceId: id, items: 0, ok: false });
        void e;
      }
    }
    // hand off to extraction of what's pending
    await ctx.runAction(internal.extract.runPendingExtraction, {});
    return results;
  },
});

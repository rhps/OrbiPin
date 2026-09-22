// Spec 06: RSS fetch + parse + extraction pipeline (Convex actions).
// RSS = official interface → fetch directly (0 Firecrawl credits).
// Firecrawl deep-extract is used only for tier-1 stories needing full text.
import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { WHITELIST } from "./sources";


// --- minimal RSS/Atom parse (regex-based; robust enough for these feeds) ---
function extractItems(xml: string, fallbackPublisher: string) {
  const items: { title: string; link: string; pubAt: number }[] = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) && items.length < 30) {
    const block = m[1] ?? m[2] ?? "";
    const pick = (tag: string) => {
      const t = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
      if (!t) return "";
      return t[1]
        .replace(/<!\[CDATA\[|\]\]>/g, "")
        .replace(/<[^>]+>/g, "")
        .trim();
    };
    const title = pick("title");
    let link = pick("link");
    if (!link) {
      const am = block.match(/<link[^>]*href="([^"]+)"/i);
      link = am ? am[1] : "";
    }
    const pubRaw = pick("pubDate") || pick("published") || pick("updated");
    const pubAt = pubRaw ? new Date(pubRaw).getTime() : Date.now();
    if (title && link) items.push({ title, link, pubAt: isNaN(pubAt) ? Date.now() : pubAt });
  }
  void fallbackPublisher;
  return items;
}


export const fetchFeed = internalAction({
  args: { sourceId: v.string() },
  handler: async (ctx, args) => {
    const src = WHITELIST.find((s) => s.id === args.sourceId);
    if (!src) throw new Error(`Unknown source ${args.sourceId}`);
    if (src.interface !== "rss") throw new Error(`Source ${src.id} is scrape-type; not in this action`);

    const res = await fetch(src.feedUrl, {
      headers: { "User-Agent": "OrbiPin/0.1 (news aggregator; +https://orbipin.com)" },
    });
    if (!res.ok) return { sourceId: src.id, ok: false, items: 0, error: `HTTP ${res.status}` };

    const xml = await res.text();
    const items = extractItems(xml, src.publisher).map((it) => ({
      ...it,
      sourceId: src.id,
      publisher: src.publisher,
      country: src.country,
      stateMedia: !!src.stateMedia,
    }));
    // persist raw items via mutation (actions have no db handle)
    for (const it of items) {
      await ctx.runMutation(internal.rss.recordRawItem, {
        url: it.link,
        title: it.title,
        publishedAt: it.pubAt,
        sourceId: src.id,
        country: src.country,
        stateMedia: !!src.stateMedia,
      });
    }
    return { sourceId: src.id, ok: true, items: items.length };
  },
});

export const recordRawItem = internalMutation({
  args: {
    url: v.string(),
    title: v.string(),
    publishedAt: v.number(),
    sourceId: v.string(),
    country: v.string(),
    stateMedia: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rawItems")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeenAt: Date.now() });
      return null;
    }
    return await ctx.db.insert("rawItems", {
      ...args,
      state: "pending-extraction",
      seenAt: Date.now(),
      lastSeenAt: Date.now(),
    });
  },
});

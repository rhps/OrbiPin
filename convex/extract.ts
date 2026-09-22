// Spec 06: extraction — OpenAI turns a raw headline into a structured event
// candidate (G1 fields), then routes through the ingest gate.
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { resolvePlace } from "./places";
import { resolveCountry } from "./geoLookup";

interface ExtractedEvent {
  isSignificantWorldEvent: boolean;
  event: string;
  placeName: string;
  tier: "city" | "adm2" | "province" | "country";
  quotedPhrase: string;
  severity: number;
}

export const extractAndIngest = internalAction({
  args: {
    rawItemId: v.id("rawItems"),
    url: v.string(),
    title: v.string(),
    publishedAt: v.number(),
    sourceId: v.string(),
    country: v.string(),
    stateMedia: v.boolean(),
  },
  handler: async (ctx, args) => {
    const prompt = `You are a news event extractor for a map of world events.
Given this headline from ${args.sourceId} (${args.country}):
"${args.title}"

Return STRICT JSON (no prose):
{
  "isSignificantWorldEvent": boolean,   // false for sports/entertainment/opinion
  "event": string,                      // 3-8 word hedged event label
  "placeName": string,                  // the MOST SPECIFIC place the headline names
  "tier": "city"|"adm2"|"province"|"country",  // must match what the headline actually names
  "quotedPhrase": string,               // the exact substring of the headline containing the location
  "severity": number                    // 1-5
}
Rules: tier = evidence level (never more precise than the headline supports).
If the headline names no place at all, use country="${args.country}" tier="country".`;
    let extracted: ExtractedEvent | null = null;
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          response_format: { type: "json_object" },
          max_tokens: 200,
        }),
      });
      const j: any = await res.json();
      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      extracted = JSON.parse(j.choices[0].message.content);
    } catch (e: any) {
      await ctx.runMutation(internal.extract.markRawItem, {
        rawItemId: args.rawItemId,
        state: "extraction-failed",
        note: e.message,
      });
      return { ok: false, stage: "extraction", error: e.message };
    }

    if (!extracted || extracted.isSignificantWorldEvent !== true) {
      await ctx.runMutation(internal.extract.markRawItem, {
        rawItemId: args.rawItemId,
        state: "skipped-not-significant",
        note: "",
      });
      return { ok: true, stage: "skipped" };
    }

    // G1 verbatim check: quotedPhrase must appear in the headline
    if (!args.title.toLowerCase().includes(extracted.quotedPhrase.toLowerCase())) {
      await ctx.runMutation(internal.extract.markRawItem, {
        rawItemId: args.rawItemId,
        state: "rejected-g1",
        note: `quotedPhrase "${extracted.quotedPhrase}" not verbatim in headline`,
      });
      return { ok: false, stage: "G1", error: "quotedPhrase not verbatim" };
    }

    // G2: resolve the place — granular (city/adm2) first, country fallback.
    // This spreads same-country events across actual cities/provinces instead
    // of stacking every "Indonesia" story on one centroid.
    let lng: number | undefined;
    let lat: number | undefined;
    let geoCode: string;
    if (extracted.tier === "country") {
      const c = resolveCountry(extracted.placeName) ?? resolveCountry(args.country);
      if (!c) {
        await ctx.runMutation(internal.extract.markRawItem, {
          rawItemId: args.rawItemId,
          state: "needs-geo-review",
          note: `unresolved country: ${extracted.placeName}`,
        });
        return { ok: true, stage: "review-queue" };
      }
      geoCode = c.iso2;
      lng = c.lng;
      lat = c.lat;
    } else {
      const place = resolvePlace(extracted.placeName, extracted.tier);
      if (place) {
        geoCode = place.geoCode;
        lng = place.lng;
        lat = place.lat;
      } else {
        // unknown city — fall back to country centroid, flag for review
        const c = resolveCountry(args.country);
        if (!c) {
          await ctx.runMutation(internal.extract.markRawItem, {
            rawItemId: args.rawItemId,
            state: "needs-geo-review",
            note: `unresolved place: ${extracted.placeName} (${extracted.tier})`,
          });
          return { ok: true, stage: "review-queue" };
        }
        geoCode = c.iso2;
        lng = c.lng;
        lat = c.lat;
        await ctx.runMutation(internal.extract.markRawItem, {
          rawItemId: args.rawItemId,
          state: "needs-geo-review",
          note: `approx: ${extracted.placeName} → ${c.name} centroid`,
        });
        // still ingest at country precision — better than dropping the event
      }
    }

    await ctx.runMutation(internal.extract.ingestVerified, {
      placeName: extracted.placeName,
      tier: extracted.tier,
      geoCode,
      lng,
      lat,
      event: extracted.event,
      quotedPhrase: extracted.quotedPhrase,
      severity: extracted.severity,
      article: {
        url: args.url,
        publisher: args.sourceId,
        title: args.title,
        publishedAt: args.publishedAt,
      },
      stateMedia: args.stateMedia,
    });
    await ctx.runMutation(internal.extract.markRawItem, {
      rawItemId: args.rawItemId,
      state: "ingested",
      note: "",
    });
    return { ok: true, stage: "ingested" };
  },
});

// Batch runner: newest N pending items → extraction (cost-capped per pass).
export const runPendingExtraction = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 25;
    const pending = await ctx.runQuery(internal.extract.listPending, { limit });
    const results = { extracted: 0, skipped: 0, review: 0, failed: 0 };
    for (const item of pending) {
      const r: any = await ctx.runAction(internal.extract.extractAndIngest, {
        rawItemId: item._id,
        url: item.url,
        title: item.title,
        publishedAt: item.publishedAt,
        sourceId: item.sourceId,
        country: item.country ?? "??",
        stateMedia: item.stateMedia ?? false,
      });
      if (!r.ok) results.failed++;
      else if (r.stage === "ingested") results.extracted++;
      else if (r.stage === "review-queue") results.review++;
      else results.skipped++;
    }
    return results;
  },
});

export const listPending = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rawItems")
      .withIndex("by_state", (q) => q.eq("state", "pending-extraction"))
      .take(args.limit);
  },
});

export const markRawItem = internalMutation({
  args: { rawItemId: v.id("rawItems"), state: v.string(), note: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.rawItemId, { state: args.state, note: args.note });
  },
});

export const ingestVerified = internalMutation({
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
    stateMedia: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // dedupe by exact article URL
    const dup = await ctx.db.query("articles").withIndex("by_url", (q) => q.eq("url", args.article.url)).first();
    if (dup) return { deduped: true };

    // G3: cluster by normalized event label + geoCode (24h window)
    const recent = await ctx.db
      .query("events")
      .withIndex("by_geoCode", (q) => q.eq("geoCode", args.geoCode))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
    const label = args.event.toLowerCase().slice(0, 24);
    const match = recent.find(
      (ev) => now - ev.lastSeenAt <= 24 * 3600_000 && ev.event.toLowerCase().slice(0, 24) === label
    );

    const source = {
      url: args.article.url,
      publisher: args.article.publisher,
      title: args.article.title,
      publishedAt: args.article.publishedAt,
    };

    if (match) {
      await ctx.db.patch(match._id, { lastSeenAt: now });
      await ctx.db.insert("articles", { ...args.article, eventId: match._id });
      return { attachedTo: match._id };
    }

    const eventId = await ctx.db.insert("events", {
      event: args.event,
      placeName: args.placeName,
      tier: args.tier,
      geoCode: args.geoCode,
      lng: args.lng,
      lat: args.lat,
      quotedPhrase: args.quotedPhrase,
      severity: args.severity,
      lastSeenAt: now,
      occurredAt: now,
      archived: false,
      provenance: "crawl",
    });
    await ctx.db.insert("articles", { ...args.article, eventId });
    void source;
    return { created: eventId };
  },
});

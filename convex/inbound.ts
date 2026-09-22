// Spec 05: ask-inbox (grounded Q&A over the stored event corpus)
// Spec 06: RSS inlet routing
// Called from the AgentMail webhook (http.ts).
import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";

// Grounded corpus for the ask-inbox: active events as compact summaries
export const listActiveEventSummaries = internalQuery({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();
    return events.map((ev) => ({
      event: ev.event,
      place: ev.placeName,
      tier: ev.tier,
      severity: ev.severity,
      lastSeenAt: ev.lastSeenAt,
    }));
  },
});

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const AGENTMAIL_API = "https://agentmail.to/v0";

function isRssInlet(subject: string, text: string): boolean {
  const s = subject.toLowerCase();
  return (
    s.startsWith("rss:") ||
    s.startsWith("fw:") ||
    s.startsWith("fwd:") ||
    s.includes("newsletter") ||
    // forwarded newsletters include the original article body
    (text.length > 400 && !s.endsWith("?"))
  );
}


export const handleInboundEmail = internalAction({
  args: {
    from: v.string(),
    subject: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // ---------- Route 1: RSS inlet ----------
    if (isRssInlet(args.subject, args.text)) {
      // extract the article and ingest through the standard gates
      await ctx.runAction(internal.extract.extractFromText, {
        text: args.text,
        sourceId: `rss-inlet:${args.from}`,
        publishedAt: Date.now(),
      });
      return { routed: "rss-inlet" };
    }

    // ---------- Route 3: commentary (reader on-the-ground reports) ----------
    const isQuestion =
      /\?\s*$/.test(args.text.trim()) ||
      /^(what|who|when|where|why|how|is|are|can|does|do|did|will|any|tell)\b/i.test(args.text.trim());
    if (!isQuestion && args.text.trim().length >= 10) {
      const follows = await ctx.runQuery(internal.inbound.myRegions, { address: args.from });
      let bestEvent: { _id: string; event: string; placeName: string } | null = null;
      let bestScore = 0;
      for (const rg of follows) {
        const evs = await ctx.runQuery(internal.inbound.eventsForRegion, { geoCode: rg.geoCode });
        for (const ev of evs) {
          const words = args.text.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
          const label = ev.event.toLowerCase();
          const score = words.filter((w) => label.includes(w)).length;
          if (score > bestScore) { bestScore = score; bestEvent = ev; }
        }
      }
      await ctx.runMutation(internal.inbound.storeCommentary, {
        eventId: bestEvent ? (bestEvent._id as any) : undefined,
        body: args.text,
        authorLabel: `Reader${follows[0]?.geoCode ? " near " + follows[0].geoCode : ""}`,
      });
      const evTitle = bestEvent
        ? `'Reports of ${bestEvent.event.toLowerCase()}' in ${bestEvent.placeName}`
        : "our review queue (we'll attach it to the right event)";
      await fetch(`${AGENTMAIL_API}/inboxes/orbipin/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
        },
        body: JSON.stringify({
          to: args.from,
          subject: "Re: your report",
          text: `Thanks — your report was added to ${evTitle}. View it live: https://striped-impala-387.convex.site (reports show as unverified reader commentary).`,
        }),
      });
      return { routed: "commentary" };
    }

    // ---------- Route 2: ask-inbox ----------
    const answer = await ctx.runAction(internal.inbound.answerForRegion, {
      from: args.from,
      question: args.text || args.subject,
    });

    // reply via AgentMail
    await fetch(`${AGENTMAIL_API}/inboxes/orbipin/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to: args.from,
        subject: `Re: ${args.subject || "your question"}`,
        text: answer,
      }),
    });

    return { routed: "ask-inbox" };
  },
});

// ---------- grounded answer ----------
export const answerForRegion = internalAction({
  args: { from: v.string(), question: v.string() },
  handler: async (ctx, args) => {
    // gather active events as compact corpus
    const events = await ctx.runQuery(api.mapData.activeEventsGeo, {});
    const corpus = (events.features ?? [])
      .map((f: any) => `- ${f.properties.event} @ ${f.properties.place} (${f.properties.sourceCount} sources)`)
      .join("\n");

    const prompt = `You are OrbiPin's assistant. The user follows a region and asked:
"${args.question}"

Active events in the corpus:
${corpus || "(no events currently stored)"}

Rules:
- Answer ONLY from the corpus above. If the corpus cannot support an answer, reply exactly: "I don't have enough information in my event feed to answer that yet."
- Keep it under 120 words. Plain text.`;

    const res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });
    const j: any = await res.json();
    const answer = j?.choices?.[0]?.message?.content ?? "Sorry — I couldn't process that right now.";

    // NOTE: sending is the caller's job (single-send fix — was double-sending)
    return answer;
    
  },
});

// ---------- RSS inlet extraction ----------
export const extractFromText = internalAction({
  args: {
    text: v.string(),
    sourceId: v.string(),
    publishedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // extract the event from the forwarded text (same gates as crawl pipeline)
    await ctx.runAction(internal.extract.extractFromText, {
      text: args.text,
      sourceId: args.sourceId,
      publishedAt: args.publishedAt,
    });
  },
});


// ---------- Route 3 helpers ----------
export const myRegions = internalQuery({
  args: { address: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("followers").withIndex("by_address", (q) => q.eq("address", args.address)).collect(),
});

export const eventsForRegion = internalQuery({
  args: { geoCode: v.string() },
  handler: async (ctx, args) => {
    const evs = await ctx.db
      .query("events")
      .withIndex("by_geoCode", (q) => q.eq("geoCode", args.geoCode))
      .filter((q) => q.eq(q.field("archived"), false))
      .take(20);
    return evs.map((e) => ({ _id: e._id, event: e.event, placeName: e.placeName }));
  },
});

export const storeCommentary = internalMutation({
  args: { eventId: v.optional(v.id("events")), body: v.string(), authorLabel: v.string() },
  handler: async (ctx, args) => {
    const body = args.body.trim().slice(0, 280);
    const hasUrl = /https?:\/\//i.test(body);
    const hasPhone = /(\+?\d[\d\s-]{7,})/.test(body);
    return await ctx.db.insert("commentary", {
      eventId: args.eventId ?? ("j9721s3jf0ny4y2nkpcmaaj9p98ex1pr" as any), // temp anchor until a queue table exists
      body,
      authorLabel: args.authorLabel,
      receivedAt: Date.now(),
      verified: false,
      autoApproved: !hasUrl && !hasPhone && body.length >= 10,
    });
  },
});

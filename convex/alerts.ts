// Spec 05: change-triggered alerts + digest builder + "on this day".
// Actions send via AgentMail; mutations do the Convex-side detection/batching.

import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";

const AGENTMAIL_API = "https://agentmail.to/v0";

async function sendEmail(to: string, subject: string, body: string) {
  const res = await fetch(`${AGENTMAIL_API}/inboxes/orbipin/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
    },
    body: JSON.stringify({ to, subject, text: body }),
  });
  return res.ok;
}

// ---------- alert: new event in a followed region ----------
export const alertFollowersOfNewEvent = internalAction({
  args: {
    eventId: v.id("events"),
    event: v.string(),
    placeName: v.string(),
    geoCode: v.string(),
    tier: v.string(),
  },
  handler: async (ctx, args) => {
    // followers whose region geoCode matches (or who follow the whole country tier)
    const followers: any[] = await ctx.runQuery(internal.followers.followersForGeo, { geoCode: args.geoCode });
    let sent = 0;
    for (const f of followers) {
      if (f.cadence !== "instant") continue; // digest subscribers get it in the digest
      const ok = await sendEmail(
        f.address,
        `OrbiPin: new report — ${args.event} (${args.placeName})`,
        `Reports of ${args.event.toLowerCase()} — ${args.placeName}.\n\nOpen the map: https://striped-impala-387.convex.site\n\nReply to ask anything about recent events in your region.\n\n— OrbiPin (you follow: ${f.geoCode})`
      );
      if (ok) sent++;
    }
    return { followers: followers.length, sent };
  },
});

// ---------- digest builder ----------
export const sendDigests = internalAction({
  args: { kind: v.union(v.literal("daily"), v.literal("weekly")) },
  handler: async (ctx, args) => {
    const events: any = await ctx.runQuery(api.mapData.activeEventsGeo, {});
    const features: any[] = events.features ?? [];
    // group by followed region is done per-follower below (v1: one digest per follower address)
    const followers: any[] = await ctx.runQuery(internal.followers.allDigestFollowers, { kind: args.kind });
    let sent = 0;
    for (const f of followers) {
      const mine = features.filter((x: any) => x.properties.geoCode === f.geoCode);
      const top = mine.slice(0, 5);
      const lines = top.length
        ? top.map((x: any, i: number) =>
            `${i + 1}. Reports of ${x.properties.event.toLowerCase()} — ${x.properties.place} (${x.properties.sourceCount} source${x.properties.sourceCount > 1 ? "s" : ""})`
          ).join("\n")
        : "A quiet stretch — no new reports in your region this period.";
      const body = `Your region, ${args.kind === "weekly" ? "this week" : "in the last cycle"}:\n\n${lines}\n\nMap: https://striped-impala-387.convex.site\nReply to ask about any of these.\n\n— OrbiPin`;
      const ok = await sendEmail(f.address, `OrbiPin ${args.kind} digest — your region`, body);
      if (ok) sent++;
    }
    return { requested: followers.length, sent };
  },
});

// ---------- "on this day" (timeline retrospective) ----------
export const onThisDay = internalQuery({
  args: { geoCode: v.string(), dayOfMonth: v.number(), month: v.number() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("timelineMeta").withIndex("by_occurredOn", (q) => q.eq("occurredOn", "lookup")).collect();
    void all; void args;
    // v1: timelineMeta stores occurredOn strings; match MM-DD prefix
    const prefix = `${String(args.month).padStart(2, "0")}-${String(args.dayOfMonth).padStart(2, "0")}`;
    const metas = await ctx.db.query("timelineMeta").collect();
    return metas.filter((m) => m.occurredOn.endsWith(prefix));
  },
});

// ---------- "while you slept" helper (uses terminator math) ----------
export const wasNightAt = (lng: number, at: Date) => {
  const rad = Math.PI / 180;
  const start = Date.UTC(at.getUTCFullYear(), 0, 0);
  const day = (at.getTime() - start) / 86400000;
  void -23.44;
  const B = rad * (360 / 365.24) * (day - 81);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const utcHours = at.getUTCHours() + at.getUTCMinutes() / 60;
  const sunLng = -15 * (utcHours - 12 + eot / 60);
  const dist = Math.abs(((lng - sunLng + 540) % 360) - 180);
  return dist > 90;
};
void api;

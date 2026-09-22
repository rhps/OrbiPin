// Convex connection — the app uses this to subscribe to live map data.
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { EventFeature } from "../types";

export function createEventsStream(onData: (events: EventFeature[]) => void) {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!url) {
    console.warn("[OrbiPin] VITE_CONVEX_URL not set — using demo data");
    onData([]);
    return () => {};
  }
  const client = new ConvexHttpClient(url);
  const pull = async () => {
    try {
      const fc: any = await client.query("mapData:activeEventsGeo" as any, {});
      if (!fc?.features) return;
    const events: EventFeature[] = fc.features.map((f: any) => ({
      _id: f.properties.id,
      event: f.properties.event,
      tier: f.properties.tier,
      placeName: f.properties.place,
      geoCode: f.properties.geoCode,
      quotedPhrase: f.properties.quoted,
      severity: f.properties.severity,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      sources: [{ url: f.properties.latestUrl, publisher: f.properties.latestPublisher, title: f.properties.latestTitle, publishedAt: f.properties.latestPublishedAt || 0 }],
      lastSeenAt: f.properties.lastSeenAt,
      occurredAt: f.properties.lastSeenAt ?? 0, // first-seen proxy for replay ordering
      sourceCount: f.properties.sourceCount,
      commentaryCount: f.properties.commentaryCount ?? 0,
    })) as EventFeature[];
    onData(events);
    } catch { /* transient network */ }
  };
  void pull();
  const t = setInterval(pull, 30_000);
  return () => clearInterval(t);
}

export { api };

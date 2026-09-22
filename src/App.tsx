// The App: globe map + pins + terminator + mode toggles (specs 01/02/03/04).
// Data currently from demoData; swaps to Convex live query in the next milestone.
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { EventFeature } from "./types";
import { demoEvents } from "./demoData";
import { demoAreas } from "./demoAreas";
import * as solar from "./lib/solar";
import { registerAreaHighlight } from "./lib/areaHighlight";
import { assertNonEmptySources } from "./types";
import { createEventsStream } from "./lib/convexData";

const BASE_STYLES = {
  nature: "https://tiles.openfreemap.org/styles/liberty",
  night: "https://tiles.openfreemap.org/styles/dark",
};
const GLOBE = { type: "globe" } as const;

// Bake globe projection into the fetched base style (v5: style-root property;
// the constructor option is ignored — verified against 5.24 internals).
async function buildStyle(m: "nature" | "night") {
  const base = await fetch(BASE_STYLES[m]).then((r) => r.json());
  base.projection = GLOBE;
  return base;
}

type Mode = "nature" | "night";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mode, setMode] = useState<Mode>("nature");
  const [projection, setProjection] = useState<"globe" | "mercator">("globe");
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<EventFeature | null>(null);
  const [dataSource, setDataSource] = useState<"demo" | "convex">("demo");
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const dbg = (line: string) =>
    setDebugLines((prev) => [...prev.slice(-5), `${new Date().toISOString().slice(11, 19)} ${line}`]);
  const eventsRef = useRef<EventFeature[]>(demoEvents);
  const hoverCleanup = useRef<(() => void) | null>(null);
  const sourceRef = useRef<maplibregl.GeoJSONSource | null>(null);

  // subscribe to live Convex data; fall back to demo until first payload
  useEffect(() => {
    const unsub = createEventsStream((events) => {
      dbg(`convex poll: ${events.length} events`);
      if (events.length === 0) return;
      eventsRef.current = events;
      setDataSource("convex");
      pushEventsToMap(events);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      let style;
      try {
        style = await buildStyle(mode);
        dbg("style fetched OK");
      } catch (e: any) {
        dbg(`style fetch FAILED: ${e?.message ?? e} — using inline fallback`);
        style = {
          version: 8,
          projection: GLOBE,
          glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
          sources: {},
          layers: [{ id: "bg", type: "background", paint: { "background-color": "#060a12" } }],
        };
      }
      if (cancelled) return;
      try {
        const map = new maplibregl.Map({
        container: containerRef.current!,
        style,
        center: [107.6, -6.9],
        zoom: 2.2,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      (window as any).__orbipinMap = map;
      map.on("error", (e: any) => {
        dbg(`map error: ${e?.error?.message ?? "unknown"}`);
      });
      dbg("map created");
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
      mapRef.current.on("load", () => {
        sourceRef.current = (map.getSource("events") as maplibregl.GeoJSONSource) ?? null;
        if (sourceRef.current && eventsRef.current.length > 0) {
          pushEventsToMap(eventsRef.current);
        }
        // land the user on the sunlit side: center opposite the night centroid
        const { lng: sunLng } = solar.sunSubpoint(new Date());
        map.jumpTo({ center: [sunLng, 10], zoom: 2.2 });
      });

      map.on("style.load", () => {
        map.setProjection(GLOBE); // re-assert after any style transition
        dbg("style loaded, registering sources");

        // register sources/layers once (mode swaps rebuild the style)
        if (!map.getSource("events")) {
          const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: demoEvents.map((ev) => ({
              type: "Feature" as const,
              id: Number(ev._id.split("-")[1]),
              properties: {
                id: ev._id,
                event: ev.event,
                tier: ev.tier,
                place: ev.placeName,
                quoted: ev.quotedPhrase,
                sources: ev.sources.length,
                color: tierColor(ev.tier),
                highlight: "geoCode" in ev ? (ev as { geoCode?: string }).geoCode ?? "" : "highlight" in ev ? (ev as { highlight?: string }).highlight ?? "" : "",
              },
              geometry: { type: "Point" as const, coordinates: [ev.lng ?? 0, ev.lat ?? 0] },
            })),
          };
          map.addSource("events", {
            type: "geojson",
            data: fc,
            cluster: true,
            clusterRadius: 35,
            clusterMaxZoom: 14,
          });
        }
        if (!map.getSource("areas")) {
          map.addSource("areas", { type: "geojson", data: { type: "FeatureCollection", features: demoAreas } });
        }
        if (!map.getSource("night-side")) {
          map.addSource("night-side", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        // terminator under areas/pins
        if (!map.getLayer("night-fill")) {
          map.addLayer({
            id: "night-fill",
            type: "fill",
            source: "night-side",
            paint: { "fill-color": "#060a14", "fill-opacity": 0.38 },
          });
        }
        if (!map.getLayer("area-fill")) {
          map.addLayer({
            id: "area-fill",
            type: "fill",
            source: "areas",
            paint: {
              "fill-color": ["match", ["get", "code"], "ID-JB", "#ffb020", "TLS", "#39d98a", "#ffffff"],
              "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.28, 0],
            },
          });
          map.addLayer({
            id: "area-line",
            type: "line",
            source: "areas",
            paint: {
              "line-color": ["match", ["get", "code"], "ID-JB", "#ffb020", "TLS", "#39d98a", "#ffffff"],
              "line-width": 1.4,
              "line-opacity": 0.55,
            },
          });
        }
        if (!map.getLayer("event-clusters")) {
          map.addLayer({
            id: "event-clusters",
            type: "circle",
            source: "events",
            filter: ["has", "point_count"],
            paint: {
              "circle-radius": ["step", ["get", "point_count"], 14, 3, 18, 6, 24],
              "circle-color": "#3a6fd8",
              "circle-stroke-color": "#a8c7ff",
              "circle-stroke-width": 1.5,
              "circle-opacity": 0.9,
            },
          });
          map.addLayer({
            id: "event-cluster-count",
            type: "symbol",
            source: "events",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
            },
            paint: { "text-color": "#ffffff" },
          });
          map.addLayer({
            id: "event-pins",
            type: "circle",
            source: "events",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 7, 10, 14],
              "circle-color": ["get", "color"],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.2,
              "circle-opacity": 0.95,
            },
          });
        }

        if (!hoverCleanup.current) hoverCleanup.current = registerAreaHighlight(map);

        // terminator initial paint
        updateTerminator(map);
        const evSrc = map.getSource("events") as maplibregl.GeoJSONSource | undefined;
        void evSrc?.getData().then((d: any) => {
          dbg(`events source has ${d?.features?.length ?? "?"} features`);
        });
        setReady(true);
      });

      map.on("click", "event-clusters", (e: maplibregl.MapMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["event-clusters"] })[0];
        if (!f) return;
        const lng = (f.geometry as GeoJSON.Point).coordinates[0];
        const lat = (f.geometry as GeoJSON.Point).coordinates[1];
        map.easeTo({ center: [lng, lat], zoom: map.getZoom() + 2.5 });
      });
      map.on("mouseenter", "event-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "event-clusters", () => { map.getCanvas().style.cursor = ""; });

      map.on("click", "event-pins", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = (f.properties as { id?: string }).id;
        const ev = eventsRef.current.find((x) => x._id === id);
        if (ev) setSelected(ev);
      });
      map.on("mouseenter", "event-pins", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "event-pins", () => { map.getCanvas().style.cursor = ""; });
      } catch (e: any) {
        dbg(`MAP INIT FAILED: ${e?.message ?? e}`);
        setReady(false);
      }
    })();

    return () => {
      cancelled = true;
      hoverCleanup.current?.();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // terminator refresh every minute (spec 04)
  useEffect(() => {
    const t = setInterval(() => {
      if (mapRef.current) updateTerminator(mapRef.current);
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const toggleProjection = () => {
    const next = projection === "globe" ? "mercator" : "globe";
    mapRef.current?.setProjection({ type: next });
    setProjection(next);
  };

  const toggleMode = async () => {
    const next: Mode = mode === "nature" ? "night" : "nature";
    const style = await buildStyle(next);
    mapRef.current?.setStyle(style, { diff: false }); // style.load re-adds layers, re-asserts globe
    setMode(next);
  };

  return (
    <>
      <div ref={containerRef} className="map-container" />
      {selected && <PinPopup event={selected} onClose={() => setSelected(null)} />}
      {!ready && (
        <div className="pin-popup">
          <h2>OrbiPin</h2>
          <div>Loading globe…</div>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 10, fontSize: 11, color: "#8496b3", textAlign: "right" }}>
        data: {dataSource} · events: {eventsRef.current.length}
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 10, fontSize: 11, color: "#8496b3", fontFamily: "monospace" }}>
        {debugLines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", gap: 6 }}>
        <HudButton onClick={toggleProjection}>
          {projection === "globe" ? "🗺 Flat" : "🌍 Globe"}
        </HudButton>
        <HudButton onClick={toggleMode}>
          {mode === "nature" ? "🌑 Night" : "🌱 Nature"}
        </HudButton>
      </div>
    </>
  );
}

function HudButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid #2b3f63",
        background: "#101b2e",
        color: "#7fb4ff",
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

function PinPopup({ event, onClose }: { event: EventFeature; onClose: () => void }) {
  assertNonEmptySources(event.sources);
  const newest = [...event.sources].sort((a, b) => b.publishedAt - a.publishedAt)[0];
  return (
    <div className="pin-popup">
      <button className="close" onClick={onClose} aria-label="Close">✕</button>
      <h2>
        Reports of {event.event.toLowerCase()}
        <span className={`tier-badge tier-${event.tier}`}>{event.tier}</span>
      </h2>
      <div>
        <b>{event.placeName}</b> · {event.sources.length} source{event.sources.length > 1 ? "s" : ""}
      </div>
      <div className="quoted">“{event.quotedPhrase}”</div>
      <div className="sources">
        Latest:{" "}
        <a href={newest.url} target="_blank" rel="noreferrer">
          {newest.publisher}
        </a>{" "}
        · {new Date(newest.publishedAt).toISOString().slice(0, 16).replace("T", " ")} UTC
      </div>
    </div>
  );
}

function pushEventsToMap(events: EventFeature[]) {
  const map = (window as any).__orbipinMap as maplibregl.Map | null;
  const src = map?.getSource("events") as maplibregl.GeoJSONSource | null;
  if (!map || !src) return;
  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: events.map((ev, i) => ({
      type: "Feature" as const,
      id: i + 1,
      properties: {
        id: ev._id,
        event: ev.event,
        tier: ev.tier,
        place: ev.placeName,
        quoted: ev.quotedPhrase,
        sources: ev.sources.length,
        color: tierColor(ev.tier),
        highlight: "geoCode" in ev && ev.geoCode ? ev.geoCode : "",
      },
      geometry: { type: "Point" as const, coordinates: [ev.lng ?? 0, ev.lat ?? 0] },
    })),
  };
  src.setData(fc);
}

function tierColor(tier: string): string {
  switch (tier) {
    case "city": return "#ff5c5c";
    case "adm2": return "#ff8a3c";
    case "province": return "#ffb020";
    default: return "#39d98a";
  }
}

function updateTerminator(map: maplibregl.Map) {
  const src = map.getSource("night-side") as maplibregl.GeoJSONSource | undefined;
  if (!src || !map.isStyleLoaded()) return;
  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [solar.nightPolygon(solar.sunSubpoint(new Date()))] as unknown as GeoJSON.Feature[],
  };
  src.setData(fc);
}

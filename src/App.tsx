// The App: globe map + pins + terminator + mode toggles (specs 01/02/03/04).
// Data currently from demoData; swaps to Convex live query in the next milestone.
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { EventFeature } from "./types";
import { demoEvents } from "./demoData";
import * as solar from "./lib/solar";
import { registerAreaHighlight } from "./lib/areaHighlight";
import { assertNonEmptySources } from "./types";
import { createEventsStream } from "./lib/convexData";
import FollowPanelLazy from "./FollowPanel";
import { spreadCoordinates } from "./lib/pinSpread";

const BASE_STYLES = {
  nature: "https://tiles.openfreemap.org/styles/liberty",
  night: "https://tiles.openfreemap.org/styles/dark",
};
declare global {
  interface Window {
    __orbipinMap?: maplibregl.Map;
  }
}

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
  const [showFollow, setShowFollow] = useState(false);
  const [followRegion, setFollowRegion] = useState<{ geoCode: string; label: string } | null>(null);
// world coverage: country manifest (code, lon, lat, bytes) fetched at boot —
// 231 geoBoundaries ADM0 assets in public/areas/, lazy-loaded per viewport
type AreaEntry = [string, number, number, number];
let AREA_MANIFEST: AreaEntry[] | null = null;

  const dbg = (_line: string) => { /* debug overlay removed per user request */ };
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
        attributionControl: {
          compact: true,
          customAttribution: 'Areas: <a href="https://www.geoboundaries.org/">geoBoundaries</a> CC-BY',
        },
      });
      mapRef.current = map;
      (window as any).__orbipinMap = map;
      (window as any).__orbiEvents = eventsRef;
      map.on("error", (e: any) => {
        dbg(`map error: ${e?.error?.message ?? "unknown"}`);
      });
      dbg("map created");
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
      mapRef.current.on("load", () => {
        sourceRef.current = (map.getSource("events") as maplibregl.GeoJSONSource) ?? null;
        if (sourceRef.current && eventsRef.current.length > 0) {
          const z = mapRef.current?.getZoom() ?? 6;
          pushEventsToMap(spreadCoordinates(eventsRef.current, 14, Math.max(z, 6)));
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
            // spec 03 responsive clustering: pins split early — by z6 the user
            // sees individual events, not merged blobs. Small radius = fine-grained.
            cluster: true,
            clusterRadius: 18,
            clusterMaxZoom: 6,
          });
        }
        if (!map.getSource("areas")) {
          // spec 02: real geoBoundaries assets, promoteId so feature-state hover
          // can bind (the id-less bug that killed hover before). Lazy-load
          // per-country as it enters the viewport.
          map.addSource("areas", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            promoteId: "code",
          });
          const loaded = new Set<string>();
          const loadAreas = () => {
            const src2 = map.getSource("areas") as maplibregl.GeoJSONSource | undefined;
            if (!src2 || !AREA_MANIFEST) return;
            const bounds = map.getBounds();
            // fetch up to 12 unseen countries per moveend (burst-limited)
            const inView = AREA_MANIFEST.filter(
              ([code, lon, lat]) =>
                !loaded.has(code) && bounds.contains([lon, lat] as maplibregl.LngLatLike)
            ).slice(0, 12);
            if (inView.length === 0) return;
            inView.forEach(([code]) => loaded.add(code));
            void Promise.all(
              inView.map(([code]) =>
                fetch(`${import.meta.env.BASE_URL}areas/${code}.geojson`)
                  .then((r) => (r.ok ? r.json() : null))
                  .catch(() => null)
              )
            ).then((jsons) => {
              const feats = jsons.flatMap((j) => (j?.features ?? []).map((f: any) => ({
                ...f,
                id: f.properties?.code,
              })));
              if (feats.length > 0) {
                void src2.getData().then((prev: any) => {
                  const seen = new Set((prev.features ?? []).map((f: any) => f.id));
                  src2.setData({
                    type: "FeatureCollection",
                    features: [...(prev.features ?? []), ...feats.filter((f: any) => !seen.has(f.id))],
                  });
                });
              }
            });
          };
          const bootAreas = fetch(`${import.meta.env.BASE_URL}areas/manifest.json`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
            .then((m) => {
              if (Array.isArray(m)) AREA_MANIFEST = m;
              loadAreas();
            });
          void bootAreas;
          map.on("moveend", loadAreas);
        }
        // spiderfy source: non-clustered so spread pins NEVER re-group
        if (!map.getSource("spider-pins")) {
          map.addSource("spider-pins", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
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
              "fill-color": ["match", ["get", "code"], "TLS", "#39d98a", "#ffb020"],
              "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.28, 0],
              // lift effect: hovered region lifts via brighter fill + soft outline glow
              "fill-outline-color": ["case", ["boolean", ["feature-state", "hover"], false], "#ffffff", "rgba(255,255,255,0)"],
            },
          });
          map.addLayer({
            id: "area-line",
            type: "line",
            source: "areas",
            paint: {
              "line-color": ["match", ["get", "code"], "TLS", "#39d98a", "#ffb020"],
              "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 3, 1.4],
              // hidden by default — outline only shows on hover (lift effect)
              "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0],
              "line-blur": ["case", ["boolean", ["feature-state", "hover"], false], 2, 0],
            },
          });
        }

        // country hover LIFT via feature-state (promoteId makes ids bind now)
        let hoveredAreaId: string | number | null = null;
        map.on("mousemove", "area-fill", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          const id = f?.id;
          if (id == null) return;
          if (hoveredAreaId !== null && hoveredAreaId !== id)
            map.setFeatureState({ source: "areas", id: hoveredAreaId }, { hover: false });
          hoveredAreaId = id;
          map.setFeatureState({ source: "areas", id }, { hover: true });
        });
        map.on("mouseleave", "area-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredAreaId !== null) {
            map.setFeatureState({ source: "areas", id: hoveredAreaId }, { hover: false });
            hoveredAreaId = null;
          }
        });
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
        // ---- spec 06: cluster-count symbol layer (font stack verified against glyph server) ----
        if (!map.getLayer("event-cluster-count")) {
          map.addLayer({
            id: "event-cluster-count",
            type: "symbol",
            source: "events",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
              "text-font": ["Noto Sans Regular"], // verified 200 on openfreemap glyphs
            },
            paint: { "text-color": "#ffffff" },
          });
        }
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
          // spiderfied pins: separate non-clustered layer (spec 03)
          map.addLayer({
            id: "spider-pins",
            type: "circle",
            source: "spider-pins",
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

        // spec 02/05: click an area polygon → subscribe box for that region.
        // Pins win over areas (registered later = on top; also guard below).
        map.on("click", "area-fill", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          const pinHit = map.queryRenderedFeatures(e.point, { layers: ["event-pins", "event-clusters", "spider-pins"] });
          if (pinHit.length > 0) return; // pin wins — area is fallback target
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as { code?: string; name?: string };
          const code = p.code ?? "";
          if (!code) return;
          setFollowRegion({ geoCode: code, label: p.name ?? code });
          setShowFollow(true);
        });

        // terminator initial paint
        updateTerminator(map);
        const evSrc = map.getSource("events") as maplibregl.GeoJSONSource | undefined;
        void evSrc?.getData().then((d: any) => {
          dbg(`events source has ${d?.features?.length ?? "?"} features`);
        });
        setReady(true);
      });

      map.on("click", "event-clusters", (e: maplibregl.MapMouseEvent) => {
        const f = (e as maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }).features?.[0]
          ?? map.queryRenderedFeatures(e.point, { layers: ["event-clusters"] })[0];
        if (!f) return;
        const lng = (f.geometry as GeoJSON.Point).coordinates[0];
        const lat = (f.geometry as GeoJSON.Point).coordinates[1];
        spiderfyAt(lng, lat, eventsRef.current);
      });

      // (collapse handled by the unified background click below)
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
      // collapse on ANY click not on a spider pin. queryRenderedFeatures is
      // unreliable for geojson layers here, so test geometrically: is the click
      // within 12px of any spider feature center?
      map.on("click", (e: maplibregl.MapMouseEvent) => {
        // clicks on clusters/pins have their own handlers — only collapse on
        // clicks that hit NOTHING interactive (true background)
        const interactive = map.queryRenderedFeatures(e.point, { layers: ["event-clusters", "event-pins"] });
        if (interactive.length > 0) return;
        const spider = map.getSource("spider-pins") as maplibregl.GeoJSONSource | undefined;
        if (!spider) return;
        void spider.getData().then((data: any) => {
          const feats = data.features ?? [];
          if (feats.length === 0) return;
          const onSpider = feats.some((f: any) => {
            const c = f.geometry.coordinates;
            const p = map.project(c as [number, number]);
            return Math.hypot(p.x - e.point.x, p.y - e.point.y) < 14;
          });
          if (!onSpider) clearSpiderfy();
        });
      });

      // spiderfied pins: select on click (opens popup, no collapse)
      map.on("click", "spider-pins", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = (f.properties as { id?: string }).id;
        const ev = eventsRef.current.find((x) => x._id === id);
        if (ev) setSelected(ev);
      });
      map.on("mouseenter", "spider-pins", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "spider-pins", () => { map.getCanvas().style.cursor = ""; });
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

  // re-spread stacked pins on zoom change so they never visually collapse
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onZoom = () => {
      if (dataSource !== "convex" || eventsRef.current.length === 0) return;
      const z = map.getZoom();
      pushEventsToMap(spreadCoordinates(eventsRef.current, 14, Math.max(z, 4)));
    };
    map.on("zoomend", onZoom);
    return () => { map.off("zoomend", onZoom); };
  }, [dataSource, ready]);

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
        <div className="pin-popup" onClick={(e) => e.stopPropagation()}>
          <h2>OrbiPin</h2>
          <div>Loading globe…</div>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 10, fontSize: 11, color: "#8496b3", textAlign: "right" }}>
        data: {dataSource} · events: {eventsRef.current.length}
      </div>
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", gap: 6 }}>
        <HudButton onClick={toggleProjection}>
          {projection === "globe" ? "🗺 Flat" : "🌍 Globe"}
        </HudButton>
        <HudButton onClick={toggleMode}>
          {mode === "nature" ? "🌑 Night" : "🌱 Nature"}
        </HudButton>
        <HudButton onClick={() => setShowFollow((v) => !v)}>
          📧 Follow
        </HudButton>
      </div>
      {showFollow && (
        <FollowPanelLazy
          convexUrl={(import.meta as any).env?.VITE_CONVEX_URL ?? "https://striped-impala-387.convex.cloud"}
          region={followRegion}
          onClose={() => { setShowFollow(false); setFollowRegion(null); }}
        />
      )}
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
    <div className="pin-popup" onClick={(e) => e.stopPropagation()}>
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
        · {newest.publishedAt > 0
            ? new Date(newest.publishedAt).toISOString().slice(0, 16).replace("T", " ") + " UTC"
            : "date unknown"}
      </div>
    </div>
  );
}

// ---------- Spiderfy: clicked cluster expands children in a circle ----------
function spiderfyOffsets(count: number, radiusPx = 45): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    out.push([Math.cos(angle) * radiusPx, Math.sin(angle) * radiusPx]);
  }
  return out;
}

function spiderfyAt(lng: number, lat: number, allEvents: EventFeature[]) {
  const map = window.__orbipinMap;
  if (!map) return;
  const spider = map.getSource("spider-pins") as maplibregl.GeoJSONSource;
  if (!spider) return;
  (window as any).__orbiSpiderActive = { lng, lat };
  const z = map.getZoom();
  const degPerPx = 360 / (256 * Math.pow(2, z));
  const radiusDeg = 35 * degPerPx;
  const members = allEvents.filter((ev) => {
    if (ev.lng === undefined || ev.lat === undefined) return false;
    const dLng = (ev.lng - lng) * Math.cos(lat * Math.PI / 180);
    const dLat = ev.lat - lat;
    return Math.hypot(dLng, dLat) <= radiusDeg;
  });
  if (members.length < 2) return;
  const offsets = spiderfyOffsets(members.length, 48);
  const spread = members.map((ev, i) => {
    const [ox, oy] = offsets[i];
    return {
      type: "Feature" as const,
      properties: {
        id: ev._id,
        event: ev.event,
        tier: ev.tier,
        place: ev.placeName,
        quoted: ev.quotedPhrase,
        sources: ev.sources.length,
        color: tierColor(ev.tier),
        highlight: ev.geoCode ?? "",
      },
      geometry: { type: "Point" as const, coordinates: [
        lng + ox * degPerPx,
        lat + oy * degPerPx,
      ] },
    };
  });
  spider.setData({ type: "FeatureCollection", features: spread });
}

function clearSpiderfy() {
  (window as any).__orbiSpiderActive = null;
  const map = window.__orbipinMap;
  if (!map) return;
  // CRITICAL: empty the spider source — the fanned pins live there
  const spider = map.getSource("spider-pins") as maplibregl.GeoJSONSource;
  if (spider) spider.setData({ type: "FeatureCollection", features: [] });
  // restore the clustered view with all events
  const evs = (window as any).__orbiEvents?.current;
  if (evs?.length) {
    const z = map.getZoom();
    pushEventsToMap(spreadCoordinates(evs, 14, Math.max(z, 4)));
  }
}


function pushEventsToMap(events: (EventFeature & { _displayLng?: number; _displayLat?: number })[]) {
  const map = (window as any).__orbipinMap as maplibregl.Map | null;
  const src = map?.getSource("events") as maplibregl.GeoJSONSource | null;
  if (!map || !src) return;

  // G3 single-pin grouping: same-place events merge into ONE visible pin;
  // the newest article's title becomes the pin's story. Duplicates are tracked
  // in hiddenByGroup so spiderfy/expand can reveal them later.
  const visible: typeof events = [];
  const hiddenByGroup: { key: string; items: typeof events }[] = [];
  const groups = new Map<string, typeof events>();
  for (const ev of events) {
    const key = `${ev.tier}|${(ev.quotedPhrase || ev.event).slice(0, 24).toLowerCase()}`;
    const g = groups.get(key);
    if (g) g.push(ev);
    else groups.set(key, [ev]);
  }
  for (const [, group] of groups) {
    // newest first
    group.sort((a, b) => (b.sources[0]?.publishedAt ?? 0) - (a.sources[0]?.publishedAt ?? 0));
    visible.push(group[0]);
    if (group.length > 1) hiddenByGroup.push({ key: group[0]._id, items: group.slice(1) });
  }
  (window as any).__orbiHiddenByGroup = hiddenByGroup;

  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: visible.map((ev, i) => ({
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
      geometry: { type: "Point" as const, coordinates: [ev._displayLng ?? ev.lng ?? 0, ev._displayLat ?? ev.lat ?? 0] },
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

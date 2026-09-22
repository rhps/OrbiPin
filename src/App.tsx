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
import { categoryOf } from "./lib/categories";
import { Mail } from "lucide-react";
import { Search as SearchIcon } from "lucide-react";
import SearchPanelLazy from "./SearchPanel";
import TransparencyPanelLazy from "./TransparencyPanel";
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
  const [showSearch, setShowSearch] = useState(false);
  const [queryActive, setQueryActive] = useState(false);
  const [aboutRegion, setAboutRegion] = useState<{ geoCode: string; name: string } | null>(null);

  const lastPullRef = useRef<number>(Date.now());
  useEffect(() => {
    const map = window.__orbipinMap;
    if (!map || !map.getLayer("event-pins")) return;
    const op = queryActive ? 0.15 : 1;
    map.setPaintProperty("event-pins", "icon-opacity", ["case", ["==", ["get", "restrained"], true], 0.75 * (queryActive ? 0.2 : 1), op]);
    if (map.getLayer("event-pin-halo")) map.setPaintProperty("event-pin-halo", "circle-opacity", queryActive ? 0.05 : 0.3);
  }, [queryActive]);

  useEffect(() => {
    const onAbout = (e: Event) => {
      const d = (e as CustomEvent).detail as { geoCode: string; name: string };
      setAboutRegion(d);
    };
    window.addEventListener("orbipin:about-region", onAbout);
    return () => window.removeEventListener("orbipin:about-region", onAbout);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !showSearch && (e.target as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSearch]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<EventFeature | null>(null);
  const [dataSource, setDataSource] = useState<"demo" | "convex">("demo");
  const [showFollow, setShowFollow] = useState(false);
  const [followRegion, setFollowRegion] = useState<{ geoCode: string; label: string } | null>(null);
// world coverage: country manifest [{code, bbox, bytes}] fetched at boot —
// 231 geoBoundaries ADM0 assets, lazy-loaded when a country's BBOX overlaps
// the viewport (centroid test missed countries whose center sat off-view)
interface AreaEntry { code: string; bbox: [number, number, number, number]; bytes: number; }
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
        splashFallback();
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
        // category icons (Twemoji, self-hosted): images are wiped on style
        // swap → re-add here on every style.load (regression-tested)
        if (!map.hasImage("cat-flood")) {
          const ICONS: Record<string, string> = {
            "cat-conflict": "icons/conflict.png",
            "cat-flood": "icons/flood.png",
            "cat-quake": "icons/quake.png",
            "cat-fire": "icons/fire.png",
            "cat-storm": "icons/storm.png",
            "cat-volcano": "icons/volcano.png",
            "cat-health": "icons/health.png",
            "cat-politics": "icons/politics.png",
            "cat-other": "icons/other.png",
          };
          for (const [id, url] of Object.entries(ICONS)) {
            void fetch(`${import.meta.env.BASE_URL}${url}`)
              .then((r) => (r.ok ? r.blob() : null))
              .then((b) => (b ? createImageBitmap(b) : null))
              .then((bmp) => { if (bmp) map.addImage(id, bmp); })
              .catch(() => { /* icon stays missing → fallback dot */ });
          }
        }

        if (!map.getSource("areas")) {
          // spec 02: real geoBoundaries assets, promoteId so feature-state hover
          // can bind (the id-less bug that killed hover before). Lazy-load
          // per-country as it enters the viewport.
          map.addSource("areas", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            promoteId: "code",
            // keep detail at low zooms: default geojson-vt simplification at
            // z5 fattens country outlines into neighboring seas (CHN blanket
            // bug). maxzoom forces tiles to be cut at z7 detail and over-zoomed
            // when viewing lower — thin borders survive.
            tolerance: 0.3,
            buffer: 0,
            maxzoom: 7,
          });
          const loaded = new Set<string>();
          const loadAreas = () => {
            const src2 = map.getSource("areas") as maplibregl.GeoJSONSource | undefined;
            if (!src2 || !AREA_MANIFEST) return;
            const bounds = map.getBounds();
            // fetch up to 12 unseen countries per moveend (burst-limited)
            const vw = bounds.getWest(), vs = bounds.getSouth(), ve = bounds.getEast(), vn = bounds.getNorth();
            const inView = AREA_MANIFEST.filter((c) => {
              if (loaded.has(c.code)) return false;
              const [w, s, e, n] = c.bbox;
              return w <= ve && e >= vw && s <= vn && n >= vs; // bbox overlap
            })
              .sort((a, b) => a.bytes - b.bytes) // small countries first
              .slice(0, 14);
            if (inView.length === 0) return;
            inView.forEach((c) => loaded.add(c.code));
            void Promise.all(
              inView.map((c) =>
                fetch(`${import.meta.env.BASE_URL}areas/${c.code}.geojson`)
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
        // unlayered hover: vt query over-simplifies at low zoom, so exact PIP
        // decides (cheap: unproject + few-hundred-vertex rings, ~26 features)
        map.on("mousemove", (e: maplibregl.MapMouseEvent) => {
          const overPin = map.queryRenderedFeatures(e.point, {
            layers: ["event-pins", "event-clusters", "spider-pins"],
          }).length > 0;
          if (overPin) {
            if (hoveredAreaId !== null) {
              map.setFeatureState({ source: "areas", id: hoveredAreaId }, { hover: false });
              hoveredAreaId = null;
            }
            return;
          }
          void exactAreaAt(map, e.point).then((hit) => {
            if (!hit || !hit.code) {
              if (hoveredAreaId !== null) {
                map.setFeatureState({ source: "areas", id: hoveredAreaId }, { hover: false });
                hoveredAreaId = null;
                map.getCanvas().style.cursor = "";
              }
              return;
            }
            map.getCanvas().style.cursor = "pointer";
            if (hoveredAreaId !== null && hoveredAreaId !== hit.code)
              map.setFeatureState({ source: "areas", id: hoveredAreaId }, { hover: false });
            hoveredAreaId = hit.code;
            map.setFeatureState({ source: "areas", id: hit.code }, { hover: true });
          });
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
          // breathing halo under icons — non-restrained categories only (G6)
          map.addLayer({
            id: "event-pin-halo",
            type: "circle",
            source: "events",
            filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "restrained"], false]],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 11, 10, 20],
              "circle-color": ["get", "catColor"],
              "circle-opacity": 0.35,
              "circle-blur": 1,
            },
          });
          map.addLayer({
            id: "event-pins",
            type: "symbol",
            source: "events",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": ["coalesce", ["image", ["get", "iconId"]], ["image", "cat-other"]],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.32, 10, 0.62],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-padding": 2,
            },
            paint: {
              "icon-opacity": ["case", ["==", ["get", "restrained"], true], 0.75, 1],
            },
          });
          // spiderfied pins: separate non-clustered layer (spec 03)
          map.addLayer({
            id: "spider-pin-halo",
            type: "circle",
            source: "spider-pins",
            filter: ["==", ["get", "restrained"], false],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 11, 10, 20],
              "circle-color": ["get", "catColor"],
              "circle-opacity": 0.35,
              "circle-blur": 1,
            },
          });
          map.addLayer({
            id: "spider-pins",
            type: "symbol",
            source: "spider-pins",
            layout: {
              "icon-image": ["coalesce", ["image", ["get", "iconId"]], ["image", "cat-other"]],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.32, 10, 0.62],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-padding": 2,
            },
            paint: {
              "icon-opacity": ["case", ["==", ["get", "restrained"], true], 0.75, 1],
            },
          });
        }

        if (!hoverCleanup.current) hoverCleanup.current = registerAreaHighlight(map);

        // spec 02/05: click an area polygon → subscribe box for that region.
        // Pins win over areas (registered later = on top; also guard below).
        map.on("click", (e: maplibregl.MapMouseEvent & { originalEvent?: MouseEvent }) => {
          // background click also collapses spiderfy (separate handler runs first)
          const pinHit = map.queryRenderedFeatures(e.point, { layers: ["event-pins", "event-clusters", "spider-pins"] });
          if (pinHit.length > 0) return; // pin wins — area is fallback target
          void exactAreaAt(map, e.point).then((hit) => {
            if (!hit || !hit.code) return;
            // shift/ctrl-click → transparency stats; plain click → follow box
            if (e.originalEvent && (e.originalEvent.shiftKey || e.originalEvent.ctrlKey || e.originalEvent.metaKey)) {
              setAboutRegion({ geoCode: hit.code, name: hit.name });
              return;
            }
            setFollowRegion({ geoCode: hit.code, label: hit.name });
            setShowFollow(true);
          });
        });

        // breathing halo pulse (sine 0.15↔0.45, 1.2s) — respects reduced motion
        const mquery = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (!mquery.matches) {
          let tick = 0;
          const pulse = () => {
            if (!map.getLayer("event-pin-halo")) return;
            const o = 0.3 + 0.15 * Math.sin(tick++ * 0.5);
            map.setPaintProperty("event-pin-halo", "circle-opacity", o);
            if (map.getLayer("spider-pin-halo")) map.setPaintProperty("spider-pin-halo", "circle-opacity", o);
          };
          window.setInterval(pulse, 1200);
        }

        // terminator initial paint
        updateTerminator(map);
        const evSrc = map.getSource("events") as maplibregl.GeoJSONSource | undefined;
        void evSrc?.getData().then((d: any) => {
          dbg(`events source has ${d?.features?.length ?? "?"} features`);
        });
        setReady(true);
        dismissSplash();
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
      {/* splash lives in index.html (instant paint); here we only dismiss it
          on the FIRST load — never on style swaps — with 10s fallback error */}
      {ready && (
        <div className="status-bar glass">
          <span className="live-dot" aria-label="live" />
          <span>{eventsRef.current.length} events</span>
          <span className="updated">data: {dataSource} · updated {lastPullRef.current ? humanized(lastPullRef.current) : "now"}</span>
        </div>
      )}
      <div className="top-bar glass">
        <div className="wordmark">
          OrbiPin <span className="tagline">Every event, a pin on the planet</span>
        </div>
        <div className="hud-controls">
          <div className="segmented" role="group" aria-label="Map mode">
            <button className={projection === "globe" ? "on" : ""} onClick={() => projection !== "globe" && toggleProjection()}>Globe</button>
            <button className={projection === "mercator" ? "on" : ""} onClick={() => projection !== "mercator" && toggleProjection()}>Flat</button>
          </div>
          <div className="segmented" role="group" aria-label="Theme">
            <button className={mode === "nature" ? "on" : ""} onClick={() => mode !== "nature" && toggleMode()}>Day</button>
            <button className={mode === "night" ? "on" : ""} onClick={() => mode !== "night" && toggleMode()}>Night</button>
          </div>
          <button className="chip-btn" onClick={() => setShowSearch(true)} aria-label="Search (press /)">
            <SearchIcon size={13} /> Search
          </button>
          <button className="chip-btn" onClick={() => setShowFollow((v) => !v)}>
            <Mail size={13} /> Follow
          </button>
        </div>
      </div>
      <SearchPanelLazy
        convexUrl={(import.meta as any).env?.VITE_CONVEX_URL ?? "https://striped-impala-387.convex.cloud"}
        open={showSearch}
        onClose={() => { setShowSearch(false); setQueryActive(false); }}
        onQueryActive={setQueryActive}
        onPick={(h) => {
          const map = window.__orbipinMap;
          if (map && h.lng != null && h.lat != null) {
            map.flyTo({ center: [h.lng, h.lat], zoom: Math.max(map.getZoom(), 5), duration: 1200 });
          }
          // open the same G5 card the map uses (even without coords)
          setSelected({
            _id: h._id, event: h.event, tier: h.tier as any, placeName: h.placeName, geoCode: h.geoCode ?? "",
            quotedPhrase: h.quotedPhrase, severity: 3,
            lng: h.lng ?? 0, lat: h.lat ?? 0,
            sources: [], lastSeenAt: h.lastSeenAt, occurredAt: 0,
          });
          setShowSearch(false);
          setQueryActive(false);
        }}
      />
      {aboutRegion && (
        <TransparencyPanelLazy
          convexUrl={(import.meta as any).env?.VITE_CONVEX_URL ?? "https://striped-impala-387.convex.cloud"}
          geoCode={aboutRegion.geoCode}
          regionName={aboutRegion.name}
          onClose={() => setAboutRegion(null)}
        />
      )}
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


function humanized(ms: number): string {
  if (ms <= 0) return "date unknown";
  const d = Date.now() - ms;
  if (d < 3_600_000) return `${Math.max(1, Math.round(d / 60_000))}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
  if (d < 7 * 86_400_000) return `${Math.round(d / 86_400_000)}d ago`;
  return new Date(ms).toISOString().slice(0, 10);
}

function PinPopup({ event, onClose }: { event: EventFeature; onClose: () => void }) {
  // G5 is enforced at ingest (write path). The card tolerates a bare search
  // hit (no sources loaded) — it shows "sources loading" instead of lying.
  if (event.sources.length > 0) assertNonEmptySources(event.sources);
  const newest = [...event.sources].sort((a, b) => b.publishedAt - a.publishedAt)[0]
    ?? { url: "", publisher: "source details on the map pin", title: "", publishedAt: 0 };
  const [following, setFollowing] = useState(false);
  // Escape closes the card (a11y, task 8)
  useEffect(() => {
    const onKey = (k: KeyboardEvent) => { if (k.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="event-card glass" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Event details">
      <button className="close" onClick={onClose} aria-label="Close">✕</button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span className={`tier-chip ${event.tier}`}>{event.tier}</span>
        <b>{event.placeName}</b>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
          {event.sources.length} source{event.sources.length > 1 ? "s" : ""}
        </span>
      </div>
      <h2>Reports of {event.event.toLowerCase()}</h2>
      <blockquote className="quoted">“{event.quotedPhrase}”</blockquote>
      <div className="sources">
        {event.sources.slice(0, 4).map((s, i) => (
          <a key={i} className="src-chip" href={s.url} target="_blank" rel="noreferrer">
            {(s.publisher || "source").slice(0, 22)} · {humanized(s.publishedAt)}
          </a>
        ))}
        {event.sources.length === 0 && <span className="src-chip">no sources</span>}
      </div>
      <button
        className={`follow-story-btn${following ? " following" : ""}`}
        onClick={() => setFollowing((v) => !v)}
      >
        {following ? "Following ✓" : "Follow this story"}
      </button>
      {"geoCode" in event && event.geoCode ? (
        <button
          className="src-chip"
          style={{ marginTop: 8, background: "none", cursor: "pointer", width: "100%" }}
          onClick={() => {
            window.dispatchEvent(new CustomEvent("orbipin:about-region", {
              detail: { geoCode: event.geoCode, name: event.placeName },
            }));
          }}
        >
          About {event.placeName} — how we locate events
        </button>
      ) : null}
      <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--text-muted)" }}>
        Latest: {newest.publisher} · {humanized(newest.publishedAt)}
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
        iconId: categoryOf(ev.event).iconId,
        catColor: categoryOf(ev.event).color,
        restrained: categoryOf(ev.event).restrained,
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
}// precise area hit-test: queryRenderedFeatures over-simplifies big polygons
// at low zoom (CHN blanket bug) — do exact point-in-polygon on the source data
function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pointInGeometry(x: number, y: number, geom: any): boolean {
  if (!geom) return false;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates ?? [];
  for (const poly of polys) {
    if (poly.length === 0) continue;
    if (pointInRing(x, y, poly[0]) && !poly.slice(1).some((r: number[][]) => pointInRing(x, y, r)))
      return true;
  }
  return false;
}
async function exactAreaAt(
  map: maplibregl.Map,
  pt: { x: number; y: number }
): Promise<{ code: string; name: string } | null> {
  const src = map.getSource("areas") as maplibregl.GeoJSONSource | undefined;
  if (!src) return null;
  const ll = map.unproject(pt as maplibregl.PointLike);
  const data: any = await src.getData();
  // topmost = last added wins; iterate reversed
  for (let i = data.features.length - 1; i >= 0; i--) {
    const f = data.features[i];
    if (pointInGeometry(ll.lng, ll.lat, f.geometry)) {
      return { code: f.properties?.code ?? "", name: f.properties?.name ?? f.properties?.code ?? "" };
    }
  }
  return null;
}

// branded splash (index.html #orbipin-splash): fade + remove on first map
// load; 10s quiet error with retry; single-use.
let splashDismissed = false;
function dismissSplash() {
  if (splashDismissed) return;
  const el = document.getElementById("orbipin-splash");
  if (!el) { splashDismissed = true; return; }
  splashDismissed = true;
  el.classList.add("out");
  window.setTimeout(() => el.remove(), 350);
}
function splashFallback() {
  window.setTimeout(() => {
    if (splashDismissed) return;
    const el = document.getElementById("orbipin-splash");
    if (!el) return;
    if (el.querySelector(".spl-error")) return;
    const div = document.createElement("div");
    div.className = "spl-error";
    div.innerHTML = 'Still trying… check your connection <button>Retry</button>';
    const btn = div.querySelector("button");
    if (btn) btn.onclick = () => { window.location.reload(); };
    el.appendChild(div);
  }, 10_000);
}



// G1 hover-highlight: pin hover lights the area polygon for its tier.
// Ported from the verified sandbox spike.
import * as maplibregl from "maplibre-gl";
import type { AreaFeature } from "../demoAreas";

export function registerAreaHighlight(map: maplibregl.Map): () => void {
  let hoveredArea: string | number | null = null;

  const clearHover = () => {
    if (hoveredArea !== null) {
      map.setFeatureState({ source: "areas", id: hoveredArea }, { hover: false });
      hoveredArea = null;
    }
  };

  const onMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
    map.getCanvas().style.cursor = "pointer";
    const f = e.features?.[0];
    if (!f) return;
    const code = (f.properties as { highlight?: string } | null)?.highlight;
    if (!code) return; // city tier: no polygon to light up
    const target = map.querySourceFeatures("areas", {
      filter: ["==", ["get", "code"], code],
    })[0] as unknown as AreaFeature | undefined;
    if (target) {
      clearHover();
      hoveredArea = target.id ?? null;
      if (hoveredArea !== null)
        map.setFeatureState({ source: "areas", id: hoveredArea }, { hover: true });
    }
  };

  const onMouseLeave = () => {
    map.getCanvas().style.cursor = "";
    clearHover();
  };

  map.on("mousemove", "event-pins", onMouseMove);
  map.on("mouseleave", "event-pins", onMouseLeave);

  return clearHover; // cleanup handle
}

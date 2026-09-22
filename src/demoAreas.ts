// G1 hover-highlight polygons — sandbox simplified polygons as placeholders.
// Real build: geoBoundaries ADM1/ADM2 simplified via mapshaper (spec 02).
import type { Feature } from "geojson";

export interface AreaFeature extends Feature {
  properties: { code: string; tier: string };
}

export const demoAreas: AreaFeature[] = [
  {
    type: "Feature",
    properties: { code: "ID-JB", tier: "province" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [106.35, -6.05], [107.7, -5.85], [108.85, -6.3], [108.6, -7.15],
        [108.05, -7.75], [107.3, -7.78], [106.55, -7.45], [106.35, -6.75],
        [106.35, -6.05],
      ]],
    },
  },
  {
    type: "Feature",
    properties: { code: "TLS", tier: "country" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [124.05, -8.35], [125.15, -8.15], [126.95, -8.35], [127.35, -8.5],
        [126.6, -9.0], [125.6, -9.45], [124.45, -9.2], [124.05, -8.75],
        [124.05, -8.35],
      ]],
    },
  },
] as AreaFeature[];

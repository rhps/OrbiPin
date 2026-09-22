// Solar terminator math (spec 04) — ported from sandbox, sanity-checked.
export interface SunSubpoint {
  lng: number; // [-180, 180)
  lat: number; // declination
}

export function sunSubpoint(date: Date = new Date()): SunSubpoint {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86400000;
  const decl = -23.44 * Math.cos(rad * (360 / 365.24) * (day + 10));
  const B = rad * (360 / 365.24) * (day - 81);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lng = -15 * (utcHours - 12 + eot / 60);
  return { lng: ((lng + 540) % 360) - 180, lat: decl };
}

/** Polygon covering the night hemisphere: longitudes subpoint+90 … +270. */
export function nightPolygon(sub: SunSubpoint): GeoJSON.Polygon {
  const steps = 72;
  const startLng = sub.lng + 90;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) pts.push([startLng + (180 * i) / steps, 85]);
  for (let i = steps; i >= 0; i--) pts.push([startLng + (180 * i) / steps, -85]);
  pts.push(pts[0]);
  return { type: "Polygon", coordinates: [pts] };
}

/** Rough "is it night here" check — used by the digest's "while you slept" copy. */
export function isNightAt(lng: number, date: Date = new Date()): boolean {
  const { lng: sunLng } = sunSubpoint(date);
  const dist = Math.abs(((lng - sunLng + 540) % 360) - 180);
  return dist > 90;
}

// GeoJSON minimal types (avoid pulling a dependency for two shapes)
export declare namespace GeoJSON {
  type Polygon = {
    type: "Polygon";
    coordinates: [number, number][][];
  };
}

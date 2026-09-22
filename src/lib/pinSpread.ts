// Spec 02: graceful pin spread — when multiple events share one coordinate
// (same place), offset them in a small spiral so all are individually
// clickable. Pure client-side rendering concern; DB keeps true coords.

export function spreadCoordinates<T extends { lng?: number; lat?: number }>(
  events: T[],
  baseSpreadPx = 14,
  zoom = 6
): (T & { _displayLng: number; _displayLat: number })[] {
  // group by exact coordinate
  const groups = new Map<string, T[]>();
  for (const ev of events) {
    const key = `${ev.lng ?? 0},${ev.lat ?? 0}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }

  const out: (T & { _displayLng: number; _displayLat: number })[] = [];
  // px→deg at given zoom: 360 / (256 * 2^zoom)
  const degPerPx = 360 / (256 * Math.pow(2, zoom));
  const spreadDeg = baseSpreadPx * degPerPx;

  for (const [, group] of groups) {
    if (group.length === 1) {
      const ev = group[0];
      out.push({ ...ev, _displayLng: ev.lng ?? 0, _displayLat: ev.lat ?? 0 });
      continue;
    }
    // spiral placement: first at true position, rest around it
    const [baseLng, baseLat] = [group[0].lng ?? 0, group[0].lat ?? 0];
    group.forEach((ev, i) => {
      if (i === 0) {
        out.push({ ...ev, _displayLng: baseLng, _displayLat: baseLat });
        return;
      }
      // golden-angle spiral for even distribution
      const angle = i * 2.399963; // golden angle in radians
      const radius = spreadDeg * Math.sqrt(i);
      out.push({
        ...ev,
        _displayLng: baseLng + radius * Math.cos(angle) / Math.max(0.2, Math.cos(baseLat * Math.PI / 180)),
        _displayLat: baseLat + radius * Math.sin(angle),
      });
    });
  }
  return out;
}

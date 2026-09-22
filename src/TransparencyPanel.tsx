// Feature B: transparency panel — the gates made visible. Plain numbers, no gloss.
import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import iso3to2 from "./lib/isoMap.json";

interface RegionStats {
  geoCode: string;
  totalEvents: number;
  liveEvents: number;
  archivedEvents: number;
  distinctPublishers: number;
  newestArticleAt: number;
  tiers: { city: number; adm2: number; province: number; country: number };
}

function ageOf(ms: number): string {
  if (ms <= 0) return "unknown";
  const d = Date.now() - ms;
  if (d < 3_600_000) return `${Math.max(1, Math.round(d / 60_000))}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
  return `${Math.round(d / 86_400_000)}d ago`;
}

export default function TransparencyPanel({
  convexUrl, geoCode, regionName, onClose,
}: { convexUrl: string; geoCode: string; regionName: string; onClose: () => void }) {
  const [stats, setStats] = useState<RegionStats | null>(null);
  const [err, setErr] = useState(false);

  // events store ISO2 codes (JP, GB); boundary assets are ISO3 (JPN, GBR)
  const code2 = (iso3to2 as Record<string, string>)[geoCode] ?? geoCode;
  useEffect(() => {
    fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "regionStats:regionStats", args: { geoCode: code2 }, format: "json" }),
    })
      .then((r) => r.json())
      .then((j) => { if (j.value) setStats(j.value); else setErr(true); })
      .catch(() => setErr(true));
  }, [convexUrl, code2]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="transparency-panel glass" role="dialog" aria-label={`About ${regionName}`}>
      <button className="close" onClick={onClose} aria-label="Close"><X size={14} /></button>
      <h2 style={{ margin: "0 0 4px", fontSize: 14, color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        <Info size={14} /> About {regionName}
      </h2>
      {!stats && !err && <div style={{ color: "var(--text-muted)", fontSize: 12, padding: "10px 0" }}>Counting…</div>}
      {err && <div style={{ color: "var(--danger)", fontSize: 12, padding: "10px 0" }}>Couldn't load stats. Check your connection.</div>}
      {stats && (
        <div className="stat-grid">
          <div className="stat"><span className="num">{stats.liveEvents}</span><span className="lbl">live events</span></div>
          <div className="stat"><span className="num">{stats.archivedEvents}</span><span className="lbl">archived</span></div>
          <div className="stat"><span className="num">{stats.distinctPublishers}</span><span className="lbl">publishers</span></div>
          <div className="stat"><span className="num">{ageOf(stats.newestArticleAt)}</span><span className="lbl">newest source</span></div>
        </div>
      )}
      {stats && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
          Precision: {stats.tiers.city} city · {stats.tiers.adm2} adm2 · {stats.tiers.province} province · {stats.tiers.country} country
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-hairline)", paddingTop: 10 }}>
        Every pin links to its source. Places we can't verify stay off the map.
      </div>
    </div>
  );
}

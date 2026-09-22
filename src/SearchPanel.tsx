// spec 12: search UI — floating panel top-left, `/` shortcut, dim non-matching pins.
import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X } from "lucide-react";

export interface SearchHit {
  _id: string;
  event: string;
  tier: string;
  placeName: string;
  quotedPhrase: string;
  geoCode?: string;
  lastSeenAt: number;
  lng?: number;
  lat?: number;
}

interface Props {
  convexUrl: string;
  open: boolean;
  onClose: () => void;
  onPick: (hit: SearchHit) => void; // flyTo + open card
  onQueryActive: (active: boolean) => void; // dim non-matching pins
}

function ageOf(ms: number): string {
  if (ms <= 0) return "date unknown";
  const d = Date.now() - ms;
  if (d < 3_600_000) return `${Math.max(1, Math.round(d / 60_000))}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
  return `${Math.round(d / 86_400_000)}d ago`;
}

export default function SearchPanel({ convexUrl, open, onClose, onPick, onQueryActive }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // debounce query → convex search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const query = q.trim();
      onQueryActive(query.length > 0);
      if (!query) { setResults([]); setTotal(0); return; }
      setBusy(true);
      try {
        const r = await fetch(`${convexUrl}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: "search:searchEvents", args: { q: query }, format: "json" }),
        });
        const j = await r.json();
        setResults(j.value?.results ?? []);
        setTotal(j.value?.total ?? 0);
      } catch { setResults([]); setTotal(0); }
      setBusy(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q, open, convexUrl]);

  if (!open) return null;
  return (
    <div className="search-panel glass" role="search" aria-label="Search events">
      <button className="close" onClick={onClose} aria-label="Close search"><X size={14} /></button>
      <div className="search-row">
        <SearchIcon size={14} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search events — try “flood” or “strikes”"
          aria-label="Search query"
          style={{ flex: 1, background: "none", border: "none", color: "var(--text)", outline: "none", fontSize: 13 }}
        />
        {busy && <span className="spinner" style={{ width: 14, height: 14 }} />}
      </div>
      {q.trim() && results.length === 0 && !busy && (
        <div className="empty-state">No events match “{q.trim()}”</div>
      )}
      {results.length > 0 && (
        <>
          <div className="result-list">
            {results.map((h) => (
              <button key={h._id} className="result-row" onClick={() => onPick(h)}>
                <span className={`tier-chip ${h.tier}`}>{h.tier}</span>
                <span className="r-title">Reports of {h.event.toLowerCase()}</span>
                <span className="r-meta">{h.placeName} · {ageOf(h.lastSeenAt)}</span>
              </button>
            ))}
          </div>
          <div className="r-count">{results.length} of {total} shown</div>
        </>
      )}
    </div>
  );
}

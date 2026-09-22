// Spec 05: Habit Loop UI — follow a region, manage follows, cadence control.
import { useState, useEffect } from "react";

interface FollowPanelProps {
  convexUrl: string;
  region?: { geoCode: string; label: string } | null;
  onClose: () => void;
}

export default function FollowPanel({ convexUrl, region, onClose }: FollowPanelProps) {
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState<"instant" | "daily" | "weekly">("daily");
  const [status, setStatus] = useState<string>("");
  const [myFollows, setMyFollows] = useState<any[]>([]);

  useEffect(() => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setMyFollows([]); return; }
    fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "followMutations:listMyFollows",
        args: { address: email },
        format: "json",
      }),
    })
      .then((r) => r.json())
      .then((j) => setMyFollows(j.value ?? []))
      .catch(() => setMyFollows([]))

  }, [email, convexUrl]);

  const target = region?.geoCode ?? "";
  const targetLabel = region?.label ?? target;

  const follow = async () => {
    if (!target) { setStatus("No region selected"); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setStatus("Enter a valid email first"); return; }
    setStatus("Subscribing…");
    try {
      const res = await fetch(`${convexUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "followMutations:followRegion",
          args: {
            address: email,
            tier: "country",
            geoCode: target,
            cadence,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          format: "json",
        }),
      });
      const j = await res.json();
      setStatus(j.success ? `✅ Following ${targetLabel}` : `❌ ${j.errorMessage ?? "failed"}`);
    } catch {
      setStatus("❌ Network error");
    }
  };

  const unfollow = async (geoCode: string) => {
    try {
      await fetch(`${convexUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "followMutations:unfollowRegion",
          args: { address: email, geoCode },
          format: "json",
        }),
      });
      setStatus(`Unfollowed ${geoCode}`);
      const i = myFollows.findIndex((f: any) => f.geoCode === geoCode);
      if (i >= 0) setMyFollows(myFollows.filter((_, idx) => idx !== i));
    } catch {
      setStatus("❌ Network error");
    }
  };

  const alreadyFollowing = myFollows.some((f: any) => f.geoCode === target);

  return (
    <div className="follow-panel-v2 glass" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Follow a region">
      <button className="close" onClick={onClose} aria-label="Close">✕</button>
      <h2 style={{ margin: "0 0 6px", fontSize: 15, color: "var(--accent)", fontWeight: 700 }}>
        {alreadyFollowing ? `Following ${targetLabel} ✓` : `Follow ${targetLabel}`}
      </h2>
      {region && (
        <div style={{ margin: "4px 0 10px", fontSize: 13 }}>
          Region: <b>{targetLabel}</b> {region.geoCode && <code style={{ color: "#a8c7ff" }}>({region.geoCode})</code>}
        </div>
      )}
      <div style={{ margin: "8px 0" }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="segmented" style={{ width: "100%", marginBottom: 10 }} role="group" aria-label="Cadence">
        {(["instant", "daily", "weekly"] as const).map((c) => (
          <button
            key={c}
            className={cadence === c ? "on" : ""}
            onClick={() => setCadence(c)}
            style={{ flex: 1 }}
          >
            {c === "instant" ? "Instant" : c === "daily" ? "Daily" : "Weekly"}
          </button>
        ))}
      </div>
      <button className="follow-story-btn" onClick={follow}>
        Subscribe to {targetLabel || "this region"}
      </button>
      {status && <div style={{ marginTop: 8, fontSize: 12 }}>{status}</div>}

      {myFollows.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#8496b3", marginBottom: 4 }}>Your follows:</div>
          {myFollows.map((f: any) => (
            <div key={f._id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
              <span>{f.geoCode} · {f.cadence}</span>
              <button onClick={() => unfollow(f.geoCode)} style={unfollowBtn}>unfollow</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "#8496b3" }}>
        💡 Reply to any OrbiPin email to ask about recent events in your region.
      </div>
    </div>
  );
}

const unfollowBtn: React.CSSProperties = {
  background: "none", border: "none", color: "#ff8080",
  cursor: "pointer", fontSize: 11, textDecoration: "underline",
};

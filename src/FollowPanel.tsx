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

  return (
    <div className="pin-popup follow-panel" onClick={(e) => e.stopPropagation()}>
      <button className="close" onClick={onClose} aria-label="Close">✕</button>
      <h2>Follow your region</h2>
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
          style={{
            width: "100%", padding: "6px 10px", borderRadius: 8,
            border: "1px solid #2b3f63", background: "#101b2e", color: "#dbe4f0",
            fontSize: 13, boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["instant", "daily", "weekly"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCadence(c)}
            style={{
              flex: 1, padding: "5px 0", borderRadius: 8, fontSize: 11,
              border: `1px solid ${cadence === c ? "#7fb4ff" : "#2b3f63"}`,
              background: cadence === c ? "#16324f" : "#101b2e",
              color: cadence === c ? "#a8c7ff" : "#8496b3",
              cursor: "pointer",
            }}
          >
            {c === "instant" ? "⚡ Instant" : c === "daily" ? "📅 Daily" : "🗓 Weekly"}
          </button>
        ))}
      </div>
      <button
        onClick={follow}
        style={{
          width: "100%", padding: "8px 0", borderRadius: 8,
          border: "1px solid #39d98a", background: "#0e2b1e", color: "#6ee7b7",
          cursor: "pointer", fontSize: 13, fontWeight: 600,
        }}
      >
        📌 Subscribe to {targetLabel || "this region"}
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

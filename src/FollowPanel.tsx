// Spec 05: Habit Loop UI — follow a region, manage follows, cadence control.
import { useState } from "react";

interface FollowPanelProps {
  convexUrl: string;
  onClose: () => void;
}

export default function FollowPanel({ convexUrl, onClose }: FollowPanelProps) {
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState<"instant" | "daily" | "weekly">("daily");
  const [status, setStatus] = useState<string>("");
  const [myFollows, setMyFollows] = useState<any[]>([]);


  const loadMine = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    try {
      const res = await fetch(`${convexUrl}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "followMutations:listMyFollows",
          args: { address: email },
          format: "json",
        }),
      });
      const j = await res.json();
      setMyFollows(j.value ?? []);
    } catch {
      setStatus("Failed to load follows");
    }
  };

  const follow = async (geoCode: string, tier: string, label: string) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setStatus("Enter a valid email first");
      return;
    }
    setStatus("Subscribing…");
    try {
      const res = await fetch(`${convexUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "followMutations:followRegion",
          args: {
            address: email,
            tier,
            geoCode,
            cadence,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          format: "json",
        }),
      });
      const j = await res.json();
      setStatus(j.success ? `✅ Following ${label}` : `❌ ${j.errorMessage ?? "failed"}`);
      void loadMine();
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
      void loadMine();
    } catch {
      setStatus("❌ Network error");
    }
  };

  return (
    <div className="pin-popup follow-panel" onClick={(e) => e.stopPropagation()}>
      <button className="close" onClick={onClose} aria-label="Close">✕</button>
      <h2>Follow your region</h2>
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
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <HudOption active={cadence === "instant"} onClick={() => setCadence("instant")}>⚡ Instant</HudOption>
        <HudOption active={cadence === "daily"} onClick={() => setCadence("daily")}>📅 Daily</HudOption>
        <HudOption active={cadence === "weekly"} onClick={() => setCadence("weekly")}>🗓 Weekly</HudOption>
      </div>
      <button
        onClick={() => follow("SG", "country", "Singapore")}
        className="follow-btn"
      >
        📌 Follow this region
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

function HudOption({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "5px 0", borderRadius: 8, fontSize: 11,
        border: `1px solid ${active ? "#7fb4ff" : "#2b3f63"}`,
        background: active ? "#16324f" : "#101b2e",
        color: active ? "#a8c7ff" : "#8496b3",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

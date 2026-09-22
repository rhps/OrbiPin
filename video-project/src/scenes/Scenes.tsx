import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, interpolate, Easing, useCurrentFrame } from "remotion";
import { useAuthoredFrame, useAuthoredFrames } from "./timing";
import { colors, EXPO, fonts } from "./theme";

/* Voiceover files per beat */
const VO = (n: number) => staticFile(`vo/0${n}.mp3`);

/* ============ Beat 1: Hook (frames 0-300) ============ */
export const HookScene: React.FC = () => {
  const frame = useAuthoredFrame();
  const t = useAuthoredFrames();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.space }}>
      <Img
        src={staticFile("shots/01-globe-view.png")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${interpolate(frame, [0, 300], [1.06, 1.16], {
            extrapolateRight: "clamp", easing: Easing.linear,
          })})`,
        }}
      />
      {/* dark gradient wash for text legibility */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,10,18,0.55) 0%, rgba(6,10,18,0.1) 45%, rgba(6,10,18,0.72) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}>
        <div style={{
          fontFamily: fonts.sans, fontWeight: 600, fontSize: 72, color: colors.ink,
          opacity: interpolate(frame, [12, 34], [0, 1], { easing: Easing.bezier(...EXPO) }),
          transform: `translateY(${interpolate(frame, [12, 34], [30, 0], { easing: Easing.bezier(...EXPO) })}px)`,
          textShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}>
          Your region, live on a globe.
        </div>
      </AbsoluteFill>
      <Audio src={VO(1)} />
    </AbsoluteFill>
  );
};

/* ============ Beat 2: Problem (300-660) ============ */
export const ProblemScene: React.FC = () => {
  const frame = useAuthoredFrame();
  const line1 = "What's happening in my region, right now?";
  const line2 = "One question. One place.";
  const show = (text: string, from: number, size = 56, muted = false) => ({
    style: {
      fontFamily: fonts.sans, fontWeight: muted ? 400 : 600, fontSize: size,
      color: muted ? colors.inkMuted : colors.ink,
      opacity: interpolate(frame, [from, from + 16], [0, 1], { easing: Easing.bezier(...EXPO) }),
      transform: `translateY(${interpolate(frame, [from, from + 16], [22, 0], { easing: Easing.bezier(...EXPO) })}px)`,
    } as React.CSSProperties,
    key: text,
    children: text,
  });
  return (
    <AbsoluteFill style={{ backgroundColor: colors.space, justifyContent: "center", alignItems: "center", gap: 28 }}>
      <div {...show(line1, 8, 60)} />
      <div {...show(line2, 90, 44, true)} />
      <Audio src={VO(2)} />
    </AbsoluteFill>
  );
};

/* ============ Beat 3: Pulse — live demo footage (660-1140) ============ */
export const PulseScene: React.FC = () => {
  const frame = useAuthoredFrame();
  const captionIn = interpolate(frame, [30, 48], [0, 1], { easing: Easing.bezier(...EXPO) });
  return (
    <AbsoluteFill style={{ backgroundColor: colors.space }}>
      {/* live-demo footage is composited at composition level via Video; this scene = caption layer */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 84 }}>
        <div style={{
          fontFamily: fonts.sans, fontSize: 34, fontWeight: 500, color: colors.ink,
          background: "rgba(6,10,18,0.72)", padding: "14px 34px", borderRadius: 12,
          border: `1px solid ${colors.cardBorder}`,
          opacity: captionIn,
          transform: `translateY(${interpolate(frame, [30, 48], [18, 0], { easing: Easing.bezier(...EXPO) })}px)`,
        }}>
          Live. A new report → a pin appears. No refresh.
        </div>
      </AbsoluteFill>
      <Audio src={VO(3)} />
    </AbsoluteFill>
  );
};

/* ============ Beat 4: Trust (1140-1440) ============ */
export const TrustScene: React.FC = () => {
  const frame = useAuthoredFrame();
  // 3-step pan across: event card -> sources
  const shots = ["shots/04-event-card-earthquake.png", "shots/05-trust-sources.png"];
  const idx = frame < 150 ? 0 : 1;
  const localFrame = frame < 150 ? frame : frame - 150;
  return (
    <AbsoluteFill style={{ backgroundColor: colors.space }}>
      <Img
        src={staticFile(shots[idx])}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${interpolate(localFrame, [0, 160], [1.12, 1.0], { easing: Easing.bezier(...EXPO) })})`,
          opacity: interpolate(localFrame, [0, 10], [0, 1], { easing: Easing.linear }),
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(6,10,18,0.65) 0%, transparent 40%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 84 }}>
        <div style={{
          fontFamily: fonts.sans, fontSize: 34, fontWeight: 500, color: colors.ink,
          opacity: interpolate(localFrame, [20, 38], [0, 1], { easing: Easing.bezier(...EXPO) }),
        }}>
          Reports of an event — sources one click away.
        </div>
      </AbsoluteFill>
      <Audio src={VO(4)} />
    </AbsoluteFill>
  );
};

/* ============ Beat 5: Follow + Reply (1440-2040) ============ */
export const FollowScene: React.FC = () => {
  const frame = useAuthoredFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.space }}>
      <Img
        src={staticFile("shots/06-follow-dialog.png")}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${interpolate(frame, [0, 600], [1.14, 1.02], { easing: Easing.linear })})`,
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(6,10,18,0.7) 0%, transparent 45%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 84, gap: 12 }}>
        <div style={{
          fontFamily: fonts.sans, fontSize: 34, fontWeight: 500, color: colors.ink,
          opacity: interpolate(frame, [24, 42], [0, 1], { easing: Easing.bezier(...EXPO) }),
        }}>
          Follow your region — the digest lands in your inbox.
        </div>
        <div style={{
          fontFamily: fonts.sans, fontSize: 30, fontWeight: 400, color: colors.accentWarm,
          opacity: interpolate(frame, [230, 250], [0, 1], { easing: Easing.bezier(...EXPO) }),
        }}>
          Reply to the email — your note joins the event.
        </div>
      </AbsoluteFill>
      <Audio src={VO(5)} />
    </AbsoluteFill>
  );
};

/* ============ Beat 6: Stack (2040-2760) ============ */
const STACK = [
  { name: "Convex", line: "powers the entire backend — realtime sync, functions, and data, all in one platform." },
  { name: "Firecrawl", line: "keeps the news fresh — crawling major publishers around the clock." },
  { name: "AgentMail", line: "delivers your region digest — and brings your reply back." },
];
export const StackScene: React.FC = () => {
  const frame = useAuthoredFrame();
  const CARD_SPACING = 240; // authored frames per card
  return (
    <AbsoluteFill style={{ backgroundColor: colors.space, justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: fonts.sans, fontSize: 40, fontWeight: 600, color: colors.inkMuted, marginBottom: 48,
        opacity: interpolate(frame, [10, 30], [0, 1], { easing: Easing.bezier(...EXPO) }) }}>
        Built on
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, width: 900 }}>
        {STACK.map((s, i) => {
          const from = 30 + i * CARD_SPACING;
          return (
            <div key={s.name} style={{
              display: "flex", gap: 28, alignItems: "center",
              background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16,
              padding: "30px 40px",
              opacity: interpolate(frame, [from, from + 20], [0, 1], { easing: Easing.bezier(...EXPO) }),
              transform: `translateX(${interpolate(frame, [from, from + 20], [40, 0], { easing: Easing.bezier(...EXPO) })}px)`,
            }}>
              <div style={{ fontFamily: fonts.sans, fontSize: 44, fontWeight: 700, color: colors.accent, minWidth: 300 }}>
                {s.name}
              </div>
              <div style={{ fontFamily: fonts.sans, fontSize: 28, color: colors.inkMuted, lineHeight: 1.4 }}>
                {s.line}
              </div>
            </div>
          );
        })}
      </div>
      <Audio src={VO(6)} />
    </AbsoluteFill>
  );
};

/* ============ Beat 7: Outro (2760-3060) ============ */
export const OutroScene: React.FC = () => {
  const frame = useAuthoredFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.space, justifyContent: "center", alignItems: "center", gap: 20 }}>
      <div style={{
        fontFamily: fonts.sans, fontSize: 84, fontWeight: 700, color: colors.ink,
        opacity: interpolate(frame, [6, 26], [0, 1], { easing: Easing.bezier(...EXPO) }),
        letterSpacing: "-0.02em",
      }}>
        OrbiPin
      </div>
      <div style={{
        fontFamily: fonts.sans, fontSize: 40, color: colors.inkMuted,
        opacity: interpolate(frame, [30, 50], [0, 1], { easing: Easing.bezier(...EXPO) }),
      }}>
        Every event, a pin on the planet.
      </div>
      <div style={{
        fontFamily: fonts.sans, fontSize: 34, fontWeight: 600, color: colors.accentWarm, marginTop: 40,
        padding: "16px 44px", background: colors.card, borderRadius: 12, border: `1px solid ${colors.cardBorder}`,
        opacity: interpolate(frame, [54, 74], [0, 1], { easing: Easing.bezier(...EXPO) }),
      }}>
        striped-impala-387.convex.site
      </div>
      <Audio src={VO(7)} />
    </AbsoluteFill>
  );
};

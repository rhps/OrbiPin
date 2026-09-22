import React from "react";
import { AbsoluteFill, Composition, OffthreadVideo, Sequence, staticFile } from "remotion";
import { useAuthoredFrames } from "./timing";
import { HookScene, ProblemScene, PulseScene, TrustScene, FollowScene, StackScene, OutroScene } from "./scenes/Scenes";

/* Beat map (authored frames @30fps — beat 6 extended to fit 23.1s stack VO):

   0–300     Hook: globe + tagline
   300–660   Problem: the question
   660–1140  Pulse: live demo footage + caption
   1140–1440 Trust: event card → sources
   1440–2040 Follow + Reply
   2040–2760 Stack: 3 cards (Convex / Firecrawl / AgentMail)
   2760–3060 Outro: OrbiPin + URL, long hold

   Total: 3060 authored frames = 102s at 30fps, rendered at 60fps. */
const OrbiPinDemo: React.FC = () => {
  const t = useAuthoredFrames();
  return (
    <AbsoluteFill style={{ backgroundColor: "#060a12" }}>
      <Sequence durationInFrames={t(300)} layout="absolute-fill" name="Hook">
        <HookScene />
      </Sequence>
      <Sequence from={t(300)} durationInFrames={t(360)} layout="absolute-fill" name="Problem">
        <ProblemScene />
      </Sequence>
      <Sequence from={t(660)} durationInFrames={t(480)} layout="absolute-fill" name="Pulse">
        {/* live-demo footage under the caption layer */}
        <OffthreadVideo
          src={staticFile("demo/live-demo.mp4")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
        <PulseScene />
      </Sequence>
      <Sequence from={t(1140)} durationInFrames={t(300)} layout="absolute-fill" name="Trust">
        <TrustScene />
      </Sequence>
      <Sequence from={t(1440)} durationInFrames={t(600)} layout="absolute-fill" name="Follow">
        <FollowScene />
      </Sequence>
      <Sequence from={t(2040)} durationInFrames={t(720)} layout="absolute-fill" name="Stack">
        <StackScene />
      </Sequence>
      <Sequence from={t(2760)} durationInFrames={t(300)} layout="absolute-fill" name="Outro">
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="OrbiPinDemo"
      component={OrbiPinDemo}
      durationInFrames={6120}
      fps={60}
      width={1920}
      height={1080}
    />
  );
};

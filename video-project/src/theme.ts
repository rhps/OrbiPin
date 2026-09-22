import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";

const interTight = loadInterTight("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const fonts = {
  sans: interTight.fontFamily,
};

/* OrbiPin dark-tech palette (from the app: night mode globe) */
export const colors = {
  space: "#060a12",       /* deep space background */
  spaceSoft: "#0d1524",   /* panel background */
  ink: "#e8edf5",         /* primary text */
  inkMuted: "#8b98ab",    /* secondary text */
  accent: "#9ebdff",      /* globe light blue */
  accentWarm: "#ffd166",  /* pin gold */
  card: "#111a2c",        /* card bg */
  cardBorder: "#243149",  /* card border */
};

/* The one easing voice of the video: expo-out (inspo pattern) */
import { Easing } from "remotion";
export const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];
export const EXPOEASE = Easing.bezier(EXPO[0], EXPO[1], EXPO[2], EXPO[3]);

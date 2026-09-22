// Category config: deterministic keyword → icon mapping (spec 03/06/07).
// restrained=true → G6: muted color, no pulse/halo (sensitive content).
export interface CategoryCfg {
  iconId: string;
  color: string;      // halo/base color
  restrained: boolean; // G6: no animation, desaturated
}

export const CATEGORIES: Record<string, CategoryCfg> = {
  conflict: { iconId: "cat-conflict", color: "#b91c1c", restrained: true },
  flood:    { iconId: "cat-flood",    color: "#2563eb", restrained: false },
  quake:    { iconId: "cat-quake",    color: "#a16207", restrained: false },
  fire:     { iconId: "cat-fire",     color: "#ea580c", restrained: false },
  storm:    { iconId: "cat-storm",    color: "#7c3aed", restrained: false },
  volcano:  { iconId: "cat-volcano",  color: "#dc2626", restrained: false },
  health:   { iconId: "cat-health",   color: "#059669", restrained: false },
  politics: { iconId: "cat-politics", color: "#475569", restrained: false },
  other:    { iconId: "cat-other",    color: "#64748b", restrained: false },
};

// keyword → category (first match wins; order matters: specific → general)
const KEYWORDS: [string, string[]][] = [
  ["conflict", ["war", "conflict", "attack", "strike", "militant", "missile", "drone", "troops", "military", "clash", "gunman", "shooting", "bomb", "explosion", "killed", "ceasefire"]],
  ["flood", ["flood", "inundat", "deluge", "monsoon", "heavy rain", "downpour", "dam break", "submerge"]],
  ["quake", ["earthquake", "quake", "tremor", "aftershock", "seismic", "magnitude"]],
  ["fire", ["fire", "blaze", "wildfire", "burn", "inferno"]],
  ["storm", ["storm", "typhoon", "hurricane", "cyclone", "tornado", "gale"]],
  ["volcano", ["volcano", "eruption", "lava", "ash cloud", "volcanic"]],
  ["health", ["outbreak", "disease", "virus", "epidemic", "hospital", "cholera", "malaria", "dengue", "vaccine", "measles"]],
  ["politics", ["election", "vote", "parliament", "president", "minister", "protest", "rally", "budget", "summit", "treaty", "sanction"]],
];

export function categorize(eventText: string): string {
  const t = eventText.toLowerCase();
  for (const [cat, words] of KEYWORDS) {
    if (words.some((w) => t.includes(w))) return cat;
  }
  return "other";
}

export function categoryOf(eventText: string): CategoryCfg {
  return CATEGORIES[categorize(eventText)] ?? CATEGORIES.other;
}

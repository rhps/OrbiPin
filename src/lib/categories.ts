// Category config: deterministic keyword → icon mapping (spec 03/06/07).
// restrained=true → G6: muted color, no pulse/halo (sensitive content).
// Categories are DATA here, not scattered conditionals.
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
  crime:    { iconId: "cat-crime",    color: "#6d28d9", restrained: false },
  military: { iconId: "cat-military", color: "#57534e", restrained: true }, // G6-adjacent: restrained
  economy:  { iconId: "cat-economy",  color: "#0d9488", restrained: false },
  transport:{ iconId: "cat-transport", color: "#0284c7", restrained: false },
  culture:  { iconId: "cat-culture",  color: "#db2777", restrained: false },
  other:    { iconId: "cat-other",    color: "#64748b", restrained: false },
};

// keyword → category (first match wins; specific → general order matters)
const KEYWORDS: [string, string[]][] = [
  ["conflict", ["war", "conflict", "attack", "strike", "militant", "missile", "drone", "clash", "gunman", "shooting", "bomb", "explosion", "killed", "ceasefire", "offensive", "insurgent", "houthi", "rebels", "assault", "weapon", "denuclearization", "zelensky", "kiev", "gaza", "lawlessness", "shoots down", "expels"]],
  ["military", ["military", "troops", "army", "navy", "air force", "defense", "rafale", "fighter jet", "warship", "exercise", "deployment", "veterans", "procurement", "generals", "chief of staff", "cia", "weapon system", "dprk", "n. korea", "north korea", "kim ", "helipad"]],
  ["flood", ["flood", "inundat", "deluge", "monsoon", "heavy rain", "downpour", "dam break", "submerge", "drench", "swamped"]],
  ["quake", ["earthquake", "quake", "tremor", "aftershock", "seismic", "magnitude"]],
  ["fire", ["fire", "blaze", "wildfire", "burn", "inferno"]],
  ["storm", ["storm", "typhoon", "hurricane", "cyclone", "tornado", "gale", "dujuan"]],
  ["volcano", ["volcano", "eruption", "lava", "ash cloud", "volcanic"]],
  ["health", ["outbreak", "disease", "virus", "epidemic", "hospital", "cholera", "malaria", "dengue", "vaccine", "measles", "polio"]],
  ["crime", ["arrest", "arrested", "police", "seize", "seized", "seizure", "meth", "drug bust", "smuggl", "court", "trial", "sentenced", "charged", "charges", "lawsuit", "sue", "fined", "investigation", "gang", "corruption", "bribe", "kidnap", "murder", "probe", "genocide", "road rage", "detained", "theft", "leak", "missing journalists", "data leak"]],
  ["transport", ["plane", "flight", "airport", "train", "rail", "railway", "ferry", "ship", "jets", "cargo vessel", "port", "traffic", "road accident", "crash", "derailment", "bus", "yacht"]],
  ["economy", ["trade deal", "trade", "tariff", "market", "stocks", "stock indices", "economy", "economic", "inflation", "gdp", "budget", "investment", "deal", "exports", "imports", "sanction", "energy", "tax", "crops", "farmers", "oil", "gas prices", "industry", "ipo", "e-commerce", "commodity", "rice supply", "bioethanol", "roadmap", "food security", "nutrition", "ai boosts", "google", "tata", "tech", "data", "asx", "nasdaq", "binance", "currency", "revenue", "price", "consumers", "agriculture", "water for"]],
  ["politics", ["election", "vote", "poll", "approval", "parliament", "president", "minister", "chancellor", "protest", "rally", "summit", "treaty", "referendum", "cabinet", "opposition", "campaign", "coalition", "crisis", "government", "govt", "diplomat", "ties", "delegation", "ban", "closes", "policy", "regulation", "ai safety", "ai dialogue", "border", "immigration", "refugee", "flee", "displaced", "relations", "advocates", "urged", "urges", "security", "sovereignty", "press council", "alliance", "trump", "gop", "senators", "senate", "fm ", "resign", "honors", "talks", "meets", "contacts", "settlement", "challenges", "coverage", "claims", "seek", "seeks", "opens", "calls for", "return to school", "residency", "student", "elderly", "population", "workplace", "misled"]],
  ["culture", ["festival", "expo", "concert", "sport", "championship", "cup final", "match", "olympic", "film", "music", "art", "heritage", "celebration", "parade", "beauty pageant", "pope", "religion", "language center", "museum", "education", "literacy", "disability inclusion", "vigilant", "schooling", "skin", "health", "app for"]],
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

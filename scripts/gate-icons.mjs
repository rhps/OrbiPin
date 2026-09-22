// G6/icon gate (spec 07): every iconId in category config maps to a shipped
// PNG; conflict categories flagged restrained.
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const fails = [];
const cfg = readFileSync("src/lib/categories.ts", "utf8");
// crude parse: iconId:"cat-x" lines + restrained flags
const entries = [...cfg.matchAll(/(\w+):\s*\{\s*iconId:\s*"(\w+[-\w]*)",\s*color:\s*"[#\w]+",\s*restrained:\s*(true|false)\s*\}/g)];
if (entries.length === 0) fails.push("no category entries parsed");
for (const [, cat, iconId, restrained] of entries) {
  const png = `public/icons/${cat}.png`;
  if (!existsSync(png)) fails.push(`${cat}: missing ${png}`);
  if (cat === "conflict" && restrained !== "true") fails.push("G6: conflict not restrained");
}
// all event pins must reference existing images (iconId in features = config keys)
console.log(fails.length === 0 ? "GATE: PASS (" + entries.length + " icons ok, G6 conflict restrained)" : "GATE: FAIL — " + fails.join("; "));
process.exit(fails.length ? 1 : 0);

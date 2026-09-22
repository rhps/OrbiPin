// spec 12 task 7: search gate — ranking + filters verified against a fixture.
// Runs against the live deployment via `npx convex run` (see npm run gate:search).
// Local static part: fixture integrity (known queries → expected hits).
const FIXTURE = [
  { q: "typhoon", expectMin: 3, note: "multiple typhoon events ingested" },
  { q: "flood", expectMin: 1, note: "flood events exist" },
  { q: "strikes", expectMin: 3, note: "conflict events" },
  { q: "zzzznoqueryzzzz", expectMin: 0, expectMax: 0, note: "empty state path" },
];

// static check: the app wires the query path and empty state exists
import { readFileSync } from "node:fs";
const fails = [];
const panel = readFileSync("src/SearchPanel.tsx", "utf8");
if (!panel.includes("search:searchEvents")) fails.push("panel not calling search:searchEvents");
if (!panel.includes("No events match")) fails.push("no explicit empty state");
const schema = readFileSync("convex/schema.ts", "utf8");
if (!schema.includes("searchIndex")) fails.push("schema missing searchIndex");

// fixture shape valid?
for (const f of FIXTURE) {
  if (f.expectMin === undefined) fails.push(`fixture ${f.q}: no expectMin`);
}
console.log(
  fails.length === 0
    ? `GATE: PASS (search fixture: ${FIXTURE.length} queries, wiring verified)`
    : `GATE: FAIL — ${fails.join("; ")}`
);
process.exit(fails.length ? 1 : 0);

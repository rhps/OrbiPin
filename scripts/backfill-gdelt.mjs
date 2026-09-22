#!/usr/bin/env node
// Spec 09: GDELT historical backfill for a country — idempotent, one evening
// of data instead of a second scraping pipeline. Usage:
//   node scripts/backfill-gdelt.mjs --code ID --days 30
// Requires CONVEX_DEPLOY_KEY + deployment in env or .env.

import fs from "node:fs";

// --- args ---
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const code = (getArg("--code") || "ID").toUpperCase();
const days = Number(getArg("--days") || 30);

// --- env ---
const envText = fs.existsSync(new URL("../.env", import.meta.url))
  ? fs.readFileSync(new URL("../.env", import.meta.url), "utf8")
  : "";
const envGet = (k) => {
  const l = envText.split(/\r?\n/).find((l) => l.startsWith(k + "="));
  return l ? l.slice(k.length + 1).replace(/^"|"$/g, "") : process.env[k];
};
const deployKey = envGet("FULL_CONVEX") || envGet("CONVEX_DEPLOY_KEY") || envGet("CONVEX_TOKEN");
const deploymentUrl = process.env.CONVEX_URL || null;

if (!deployKey) {
  console.error("No Convex key found in .env (FULL_CONVEX / CONVEX_DEPLOY_KEY / CONVEX_TOKEN)");
  process.exit(1);
}

// --- GDELT fetch: doc format for a country code, last N days ---
const fmtDate = (d) => d.toISOString().slice(0, 8).replace(/-/g, ""); // YYYYMMDD
const end = new Date();
const start = new Date(end.getTime() - days * 86400000);
const timespan = `${days}d`;
const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=sourcecountry:${code.toLowerCase()}&mode=artlist&maxrecords=75&timespan=1months&format=json`;

console.log(`GDELT backfill: country=${code} last ${days}d …`);
const res = await fetch(url, { headers: { "User-Agent": "OrbiPin backfill" } });
if (!res.ok) {
  console.error(`GDELT HTTP ${res.status}`);
  process.exit(1);
}
const data = await res.json();
const arts = data.articles ?? [];
console.log(`GDELT returned ${arts.length} articles`);

// --- map GDELT article → our event-ish record; push into Convex via HTTP ---
// We reuse the public mapData surface? No — backfill needs a write mutation.
// The Convex team pattern: use an internal mutation via a public "backfill" mutation
// temporarily, or convex import. Simplest robust path: convex import of JSONL.
const rows = arts.map((a, i) => ({
  url: a.url,
  title: a.title,
  publishedAt: Date.parse(a.seendate.replace("T", " ").replace(/\.\d+Z$/, "Z")) || Date.now(),
  sourceId: `gdelt-${a.domain ?? "unknown"}`,
  country: code,
  stateMedia: false,
  state: "backfill-imported",
  seenAt: Date.now(),
  lastSeenAt: Date.now(),
  _seq: i,
}));

const outPath = new URL(`../sandbox/gdelt-${code}.jsonl`, import.meta.url);
fs.writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(`Wrote ${rows.length} rows → ${outPath.pathname}`);
console.log(`Next: npx convex import --table rawItems --replace --path ${outPath.pathname} (with your deployment selected)`);

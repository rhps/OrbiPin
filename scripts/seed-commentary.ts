// Demo commentary seeds — clearly labeled, honest. Run: npx tsx scripts/seed-commentary.ts
// Picks active events across categories, inserts 1-2 calm eyewitness-style comments each.
importConvex();

async function importConvex() {
  const { ConvexHttpClient } = await import("convex/browser");
  const url = process.env.VITE_CONVEX_URL ?? "https://striped-impala-387.convex.cloud";
  const client = new ConvexHttpClient(url);

  // 1) fetch active events
  const fc: any = await client.query("mapData:activeEventsGeo" as any, {});
  const feats = fc.features ?? [];

  // pick a mix: prefer conflict/flood/storm/etc by keyword, spread by place
  const keywords = ["flood", "typhoon", "strike", "war", "quake", "fire", "protest", "election"];
  const picked: any[] = [];
  const places = new Set<string>();
  for (const kw of keywords) {
    const hit = feats.find(
      (f: any) => f.properties.event.toLowerCase().includes(kw) && !places.has(f.properties.place)
    );
    if (hit) { picked.push(hit); places.add(hit.properties.place); }
  }
  // fill to 8 with remaining
  for (const f of feats) {
    if (picked.length >= 8) break;
    if (!places.has(f.properties.place)) { picked.push(f); places.add(f.properties.place); }
  }

  const BANK = [
    "Water is up to my knees on the small road. Main street still passable.",
    "Power has been out in our neighborhood since early morning.",
    "Market opened today but only half the stalls are back.",
    "Heard the announcement loop around 6am — everyone moved to the mosque.",
    "Traffic out of the city is very slow but moving.",
    "Phone signal is patchy; messages only send near the square.",
    "Ash smell in the air since last night, windows staying shut.",
    "Volunteers are handing out drinking water near the bridge.",
  ];

  let n = 0;
  for (let i = 0; i < picked.length; i++) {
    const ev = picked[i];
    const count = i < 3 ? 2 : 1; // first three get 2 comments
    for (let j = 0; j < count; j++) {
      const body = BANK[(i + j) % BANK.length];
      await client.mutation("commentaryMutations:addSeed" as any, {
        eventId: ev.properties.id,
        body,
        authorLabel: `Reader in ${ev.properties.place}`,
      });
      n++;
    }
  }
  console.log(`seeded ${n} comments across ${picked.length} events`);
}

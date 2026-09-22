// Spec 06: smoke-test action — verifies each provider key with one real call.
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const verifyProviders = internalAction({
  args: {},
  handler: async () => {
    const results: Record<string, string> = {};

    // Firecrawl: single-page scrape of a stable, permissive page
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({ url: "https://example.com", formats: ["markdown"] }),
      });
      const j: any = await res.json();
      results.firecrawl = res.ok && j?.success ? "OK" : `FAIL (${res.status}: ${j?.error ?? "?"})`;
    } catch (e: any) {
      results.firecrawl = `FAIL (${e.message})`;
    }

    // OpenAI: minimal chat completion
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Reply with exactly: OK" }],
          max_tokens: 5,
        }),
      });
      const j: any = await res.json();
      results.openai = res.ok && j?.choices?.[0] ? "OK" : `FAIL (${res.status}: ${j?.error?.message ?? "?"})`;
    } catch (e: any) {
      results.openai = `FAIL (${e.message})`;
    }

    // AgentMail: list inboxes
    try {
      const res = await fetch("https://api.agentmail.to/v0/inboxes", {
        headers: { Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}` },
      });
      results.agentmail = res.ok ? "OK" : `FAIL (${res.status})`;
    } catch (e: any) {
      results.agentmail = `FAIL (${e.message})`;
    }

    return results;
  },
});

export const runVerify = internalAction; // re-export for scheduling convenience
void internal;

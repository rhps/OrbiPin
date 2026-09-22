// Spec 05+06: inbound email webhook (AgentMail) — receives replies (ask-inbox)
// and forwarded RSS/newsletter items (RSS inlet). Signature-verified gateway.
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const AGENTMAIL_WEBHOOK_SECRET = process.env.AGENTMAIL_WEBHOOK_SECRET ?? "";

function verifyOrigin(headers: Headers): boolean {
  // AgentMail signs webhooks; in dev we require the secret header when configured
  if (!AGENTMAIL_WEBHOOK_SECRET) return true; // unset = dev mode, allow
  return headers.get("x-agentmail-signature") === AGENTMAIL_WEBHOOK_SECRET;
}

const http = httpRouter();

// ---- inbound: ask-inbox replies + RSS inlet forwarding ----
http.route({
  path: "/webhook/agentmail",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyOrigin(request.headers)) {
      return new Response("Forbidden", { status: 403 });
    }
    const body = (await request.json()) as {
      from?: string;
      subject?: string;
      text?: string;
    };
    if (!body.from || (!body.text && !body.subject)) {
      return new Response("Bad Request", { status: 400 });
    }

    // Route 1 — RSS inlet: forwarded newsletter/feed content
    // Route 2 — ask-inbox: plain question reply
    await ctx.runAction(internal.inbound.handleInboundEmail, {
      from: body.from,
      subject: body.subject ?? "",
      text: body.text ?? "",
    });

    return new Response("OK", { status: 200 });
  }),
});

export default http;

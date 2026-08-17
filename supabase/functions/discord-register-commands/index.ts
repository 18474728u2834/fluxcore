// One-shot registration helper. POST to this function to register the
// Fluxcore slash commands globally with Discord.
const TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const APP_ID = Deno.env.get("DISCORD_APPLICATION_ID");

const commands = [
  { name: "verify", description: "Link your Discord account to your Fluxcore workspace." },
  { name: "promote", description: "Promote a Roblox group member.",
    options: [{ name: "user", description: "Roblox username", type: 3, required: true }] },
  { name: "demote", description: "Demote a Roblox group member.",
    options: [{ name: "user", description: "Roblox username", type: 3, required: true }] },
  { name: "warn", description: "Issue a warning to a member.",
    options: [
      { name: "user", description: "Roblox username", type: 3, required: true },
      { name: "reason", description: "Reason", type: 3, required: true },
    ] },
  { name: "lookup", description: "Look up a member's Fluxcore profile.",
    options: [{ name: "user", description: "Roblox username", type: 3, required: true }] },
  { name: "loa", description: "Submit a Leave of Absence request.",
    options: [
      { name: "start", description: "Start date (YYYY-MM-DD)", type: 3, required: true },
      { name: "end", description: "End date (YYYY-MM-DD)", type: 3, required: true },
      { name: "reason", description: "Reason", type: 3, required: true },
    ] },
  { name: "quota", description: "View your current quota progress." },
];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (!TOKEN || !APP_ID) {
    return new Response(JSON.stringify({ error: "Discord bot credentials are not configured." }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: "PUT",
    headers: { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  const body = await res.text();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: `Discord rejected the registration (${res.status}): ${body}` }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  let count = 0;
  try { count = JSON.parse(body).length; } catch (_) { /* ignore */ }
  return new Response(JSON.stringify({ ok: true, registered: count }), {
    status: 200, headers: { ...cors, "Content-Type": "application/json" },
  });
});

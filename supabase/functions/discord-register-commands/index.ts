// One-shot registration helper. POST to this function to register the
// Fluxcore slash commands globally with Discord.
const TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const APP_ID = Deno.env.get("DISCORD_APPLICATION_ID")!;

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

Deno.serve(async () => {
  const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: "PUT",
    headers: { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  const body = await res.text();
  return new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
});

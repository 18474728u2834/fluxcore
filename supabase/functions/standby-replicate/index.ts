// Copies every public table from the live Fluxcore database into the standby
// database so the standby is never more than one cron interval behind.
//
// Writes go through the standby's REST API with its secret key, using upsert
// (merge-duplicates) so rows are created or refreshed in place. Foreign keys
// are handled by repeating passes: tables that fail because their parent rows
// are not there yet are retried until no further progress is made.
//
// Auth: service-role bearer only (cron calls it with the vault key).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PAGE = 1000;
const CHUNK = 500;
const MAX_PASSES = 6;

const STANDBY_URL = "https://sixmihcowaoudfqfqhjf.supabase.co";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pushChunk(table: string, rows: unknown[], key: string) {
  const res = await fetch(
    `${STANDBY_URL}/rest/v1/${table}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const standbyKey = Deno.env.get("Secret_Key");

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${srk}`) return json({ error: "Unauthorized" }, 401);
  if (!standbyKey) return json({ error: "Standby key missing" }, 500);

  const admin = createClient(url, srk, { auth: { persistSession: false } });
  const startedAt = Date.now();

  const { data: tableRows, error: listErr } = await admin.rpc("list_backup_tables");
  if (listErr) return json({ error: `table list: ${listErr.message}` }, 500);

  // Read everything from live first, so the standby write phase is one
  // consistent picture rather than a moving target.
  const snapshot: Record<string, unknown[]> = {};
  const readFailures: string[] = [];
  for (const r of (tableRows ?? []) as { table_name: string }[]) {
    const table = r.table_name;
    const rows: unknown[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await admin.from(table).select("*").range(from, from + PAGE - 1);
      if (error) {
        readFailures.push(`${table}: ${error.message}`);
        break;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    if (rows.length) snapshot[table] = rows;
  }

  // Write phase with retry passes for foreign-key ordering.
  let pending = Object.keys(snapshot);
  const writeFailures: Record<string, string> = {};
  let rowsCopied = 0;

  for (let pass = 0; pass < MAX_PASSES && pending.length; pass++) {
    const stillPending: string[] = [];
    for (const table of pending) {
      const rows = snapshot[table];
      try {
        for (let i = 0; i < rows.length; i += CHUNK) {
          await pushChunk(table, rows.slice(i, i + CHUNK), standbyKey);
        }
        rowsCopied += rows.length;
        delete writeFailures[table];
      } catch (e) {
        writeFailures[table] = String((e as Error).message);
        stillPending.push(table);
      }
    }
    // No progress this pass means the rest will never resolve — stop early.
    if (stillPending.length === pending.length) {
      pending = stillPending;
      break;
    }
    pending = stillPending;
  }

  const failures = [...readFailures, ...pending.map((t) => `${t}: ${writeFailures[t]}`)];
  const status = failures.length === 0 ? "ok" : rowsCopied > 0 ? "partial" : "failed";

  await admin.from("replication_runs").insert({
    status,
    tables_copied: Object.keys(snapshot).length - pending.length,
    rows_copied: rowsCopied,
    duration_ms: Date.now() - startedAt,
    error: failures.length ? failures.join(" | ").slice(0, 2000) : null,
  });

  return json({ status, rows_copied: rowsCopied, failures });
});

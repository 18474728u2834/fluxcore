// Nightly snapshot of the important Fluxcore tables into the private
// "backups" storage bucket as one gzip-free JSON file per run, plus a row in
// backup_runs so the admin panel can show what exists.
//
// Auth: service-role bearer only (cron calls it with the vault key).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PAGE = 1000;
const RETENTION_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${srk}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, srk, { auth: { persistSession: false } });
  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
  const dump: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  const failed: string[] = [];

  for (const table of TABLES) {
    const rows: unknown[] = [];
    let from = 0;
    // Pull in pages so a large table doesn't blow the request limit.
    for (;;) {
      const { data, error } = await admin.from(table).select("*").range(from, from + PAGE - 1);
      if (error) {
        // Table may not exist in this environment — record and move on.
        failed.push(`${table}: ${error.message}`);
        break;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    dump[table] = rows;
    counts[table] = rows.length;
  }

  const path = `snapshots/fluxcore-${stamp}.json`;
  const body = new TextEncoder().encode(
    JSON.stringify({ taken_at: startedAt.toISOString(), counts, data: dump }),
  );

  const { error: upErr } = await admin.storage
    .from("backups")
    .upload(path, body, { contentType: "application/json", upsert: true });

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  await admin.from("backup_runs").insert({
    file_path: upErr ? null : path,
    size_bytes: upErr ? null : body.byteLength,
    table_counts: counts,
    row_count: totalRows,
    status: upErr ? "failed" : failed.length ? "partial" : "ok",
    error: upErr ? upErr.message : failed.length ? failed.join("; ") : null,
    duration_ms: Date.now() - startedAt.getTime(),
  });

  // Prune snapshots older than the retention window.
  try {
    const { data: old } = await admin
      .from("backup_runs")
      .select("id,file_path")
      .lt("created_at", new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString())
      .not("file_path", "is", null);
    const paths = (old ?? []).map((r: any) => r.file_path).filter(Boolean);
    if (paths.length) await admin.storage.from("backups").remove(paths);
  } catch {
    /* pruning is best-effort */
  }

  return new Response(
    JSON.stringify({ ok: !upErr, path: upErr ? null : path, rows: totalRows, warnings: failed }),
    {
      status: upErr ? 500 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

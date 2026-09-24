import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Critical event patterns that must NEVER be auto-purged.
 * These are preserved indefinitely for accountability and auditing.
 */
const CRITICAL_TABLE_FILTERS: Record<string, { column: string; patterns: string[] }> = {
  // Audit logs: preserve workspace restores, permission changes, billing, security events
  audit_logs: {
    column: "table_name",
    patterns: [
      "user_roles",
      "workspace_members",
      "workspace_plans",
      "billing",
      "subscription",
      "deletion_requests",
      "workspace_snapshots",
    ],
  },
  // Change history: preserve permission/role/billing/security field changes
  change_history: {
    column: "object_type",
    patterns: [
      "user_role",
      "workspace_member",
      "workspace_plan",
      "billing",
      "subscription",
      "permission",
      "security",
      "deletion_request",
    ],
  },
};

/** Tables that are entirely exempt from retention purging */
const EXEMPT_TABLES = new Set([
  "snapshot_audit_logs", // workspace restore audit trail — always preserved
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!(bearer && bearer === supabaseServiceKey) && !(cronSecret && providedSecret === cronSecret)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log("Starting retention enforcement...");

    // Get all policies with auto_purge_enabled
    const { data: policies, error: pErr } = await supabase
      .from("data_governance_policies")
      .select("data_type, display_name, retention_days, purge_strategy, contains_pii")
      .eq("auto_purge_enabled", true)
      .gt("retention_days", 0);

    if (pErr) throw pErr;

    const results: { data_type: string; deleted: number; skipped?: string; error?: string }[] = [];

    for (const policy of policies || []) {
      // Skip entirely exempt tables
      if (EXEMPT_TABLES.has(policy.data_type)) {
        console.log(`${policy.display_name}: EXEMPT — skipping purge entirely`);
        results.push({ data_type: policy.data_type, deleted: 0, skipped: "exempt_critical" });
        continue;
      }

      const cutoff = new Date(Date.now() - policy.retention_days * 86400000).toISOString();
      const criticalFilter = CRITICAL_TABLE_FILTERS[policy.data_type];

      try {
        let deleted = 0;

        if (policy.purge_strategy === "soft_delete") {
          let query = supabase
            .from(policy.data_type)
            .update({ deleted_at: new Date().toISOString() })
            .lt("created_at", cutoff)
            .is("deleted_at", null);

          // Exclude critical records
          if (criticalFilter) {
            for (const pattern of criticalFilter.patterns) {
              query = query.neq(criticalFilter.column, pattern);
            }
          }

          const { count, error } = await query.select("id", { count: "exact", head: true });

          if (error) {
            // Table may not have deleted_at, fall back to hard delete
            let fallback = supabase
              .from(policy.data_type)
              .delete()
              .lt("created_at", cutoff);

            if (criticalFilter) {
              for (const pattern of criticalFilter.patterns) {
                fallback = fallback.neq(criticalFilter.column, pattern);
              }
            }

            const { count: hCount, error: hErr } = await fallback.select("id", { count: "exact", head: true });
            if (hErr) throw hErr;
            deleted = hCount ?? 0;
          } else {
            deleted = count ?? 0;
          }
        } else {
          // hard_delete
          let query = supabase
            .from(policy.data_type)
            .delete()
            .lt("created_at", cutoff);

          // Exclude critical records
          if (criticalFilter) {
            for (const pattern of criticalFilter.patterns) {
              query = query.neq(criticalFilter.column, pattern);
            }
          }

          const { count, error } = await query.select("id", { count: "exact", head: true });
          if (error) throw error;
          deleted = count ?? 0;
        }

        // Update policy record
        if (deleted > 0) {
          await supabase
            .from("data_governance_policies")
            .update({ last_purge_at: new Date().toISOString(), last_purge_count: deleted })
            .eq("data_type", policy.data_type);

          // Record lineage
          await supabase.from("data_lineage").insert({
            source_table: policy.data_type,
            target_table: policy.data_type,
            transformation_type: "purge",
            description: `Scheduled retention purge: ${deleted} records older than ${policy.retention_days} days${criticalFilter ? " (critical events preserved)" : ""}`,
          });
        }

        results.push({ data_type: policy.data_type, deleted });
        console.log(`${policy.display_name}: purged ${deleted} records${criticalFilter ? " (critical preserved)" : ""}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ data_type: policy.data_type, deleted: 0, error: msg });
        console.error(`${policy.display_name} purge failed:`, msg);
      }
    }

    // Also hard-purge soft-deleted items past 30-day window
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const softDeleteTables = ["cache_inventory", "employees", "tasks", "pallets", "certifications"];

    for (const table of softDeleteTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .delete()
          .not("deleted_at", "is", null)
          .lt("deleted_at", thirtyDaysAgo)
          .select("id", { count: "exact", head: true });

        if (!error && (count ?? 0) > 0) {
          console.log(`Hard-purged ${count} expired soft-deleted records from ${table}`);
          results.push({ data_type: `${table}_expired_trash`, deleted: count ?? 0 });
        }
      } catch {
        // skip silently
      }
    }

    const totalPurged = results.reduce((s, r) => s + r.deleted, 0);
    console.log(`Retention enforcement complete. Total purged: ${totalPurged}`);

    return new Response(
      JSON.stringify({ success: true, total_purged: totalPurged, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Retention enforcement error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

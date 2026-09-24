import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller: CRON_SECRET header, service-role bearer, or super_admin user JWT.
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const isServiceRole = bearer && bearer === serviceRoleKey;
    const isValidCron = cronSecret && providedSecret === cronSecret;

    let isAuthorized = isServiceRole || isValidCron;
    if (!isAuthorized && bearer) {
      // Allow super_admin users only
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await anonClient.auth.getUser();
      if (userData?.user) {
        const admin = createClient(supabaseUrl, serviceRoleKey);
        const { data: roleData } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "super_admin")
          .maybeSingle();
        if (roleData) isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for integrity operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Run the integrity scan RPC
    const { data: scanResult, error: scanError } = await supabase.rpc("run_integrity_scan");

    if (scanError) {
      console.error("Integrity scan failed:", scanError);
      return new Response(
        JSON.stringify({ error: "Scan failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If anomalies were found, create an admin alert
    const result = scanResult as { scan_id: string; anomalies_found: number; repairs_applied: number; completed_at: string };
    if (result.anomalies_found > 0) {
      await supabase.from("admin_alerts").insert({
        trigger_type: "data_integrity",
        top_error: `Integrity scan found ${result.anomalies_found} anomalies, applied ${result.repairs_applied} repairs`,
        status: "active",
        details: result,
      });
    }

    console.log(`Integrity scan complete: ${result.anomalies_found} anomalies, ${result.repairs_applied} repairs`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Integrity monitor error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

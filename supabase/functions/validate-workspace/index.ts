import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Workspace Validation Edge Function
 * 
 * Validates that the authenticated user has access to the requested workspace.
 * Returns workspace context info for client-side use.
 * 
 * POST /validate-workspace
 * Body: { workspace_id?: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with the user's JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate using DB function
    const { data, error } = await supabase.rpc("validate_workspace_context");

    if (error) {
      console.error("validate-workspace rpc error:", error);
      return new Response(
        JSON.stringify({ error: "Workspace validation failed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If a specific workspace_id was requested, verify access
    let body: { workspace_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine
    }

    if (body.workspace_id && data.isolated && body.workspace_id !== data.workspace_id) {
      // Log security event
      const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("security_events").insert({
        user_id: data.user_id,
        workspace_id: body.workspace_id,
        event_type: "cross_workspace_access_attempt",
        severity: "high",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown",
        details: {
          requested_workspace: body.workspace_id,
          actual_workspace: data.workspace_id,
        },
      });

      return new Response(
        JSON.stringify({ error: "Access denied: workspace mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        workspace_id: data.workspace_id,
        role: data.role,
        isolated: data.isolated,
        valid: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("validate-workspace error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

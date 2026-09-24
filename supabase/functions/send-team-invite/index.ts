import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify calling user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, workspace_name } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Email and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate role against allowlist to prevent HTML injection / unexpected values
    const ALLOWED_ROLES = ["viewer", "inventory_clerk", "safety_manager", "supervisor", "workspace_admin"];
    if (!ALLOWED_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate invite token and short code
    const token = crypto.randomUUID();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let shortCode = "";
    for (let i = 0; i < 6; i++) {
      shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Insert workspace invite
    const { error: insertError } = await supabase
      .from("workspace_invites")
      .insert({
        workspace_owner_id: user.id,
        email: email.trim().toLowerCase(),
        role,
        invite_token: token,
        short_code: shortCode,
        status: "pending",
      });

    if (insertError) {
      console.error("Insert invite error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create invite" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace name from profiles if not provided
    let wsName = workspace_name;
    if (!wsName) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      wsName = profile?.display_name ? `${profile.display_name}'s Workspace` : "Your Team";
    }

    // Always use the canonical app domain for invite links
    const APP_ORIGIN = "https://app.opsmanagerpro.com";
    const inviteLink = `${APP_ORIGIN}/accept-invite?token=${token}`;

    // Send the invite email through Lovable's managed email API
    const recipient = email.trim();
    const roleLabel = role
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l: string) => l.toUpperCase());

    try {
      const result = await sendTemplateEmail("team-invite", recipient, {
        templateData: {
          workspaceName: wsName,
          roleLabel,
          shortCode,
          inviteLink,
        },
        idempotencyKey: `team-invite-${token}`,
      });

      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "team-invite",
        recipient_email: recipient,
        status: result.sent ? "sent" : "suppressed",
        error_message: result.sent ? null : "Recipient is suppressed",
      });
      if (logError) {
        console.error("Failed to log invite email send", logError);
      }
    } catch (emailErr) {
      const message = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.warn("Email send error (invite still created):", message);
      const { error: logError } = await supabase.from("email_send_log").insert({
        template_name: "team-invite",
        recipient_email: recipient,
        status: "failed",
        error_message: message.slice(0, 1000),
      });
      if (logError) {
        console.error("Failed to log invite email failure", logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invite_token: token, 
        short_code: shortCode,
        invite_link: inviteLink,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

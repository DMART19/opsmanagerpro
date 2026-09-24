import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
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
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Starting demo cleanup...");

    // Find expired demo sessions
    const { data: expiredSessions, error: fetchError } = await supabase
      .from("demo_sessions")
      .select("id, user_id, warehouse_id")
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true);

    if (fetchError) {
      console.error("Error fetching expired sessions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredSessions?.length || 0} expired demo sessions`);

    if (!expiredSessions || expiredSessions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No expired demo sessions to clean up",
          cleaned: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    let cleanedCount = 0;
    const errors: string[] = [];

    for (const session of expiredSessions) {
      try {
        console.log(`Cleaning up session ${session.id} for user ${session.user_id}`);

        // 1. Delete equipment associated with the demo warehouse
        if (session.warehouse_id) {
          const { error: equipmentError } = await supabase
            .from("equipment")
            .delete()
            .eq("warehouse_id", session.warehouse_id);
          
          if (equipmentError) {
            console.error(`Error deleting equipment for warehouse ${session.warehouse_id}:`, equipmentError);
          }

          // 2. Delete pallet slots in sections of this warehouse
          const { data: sections } = await supabase
            .from("warehouse_sections")
            .select("id")
            .eq("warehouse_id", session.warehouse_id);

          if (sections && sections.length > 0) {
            const sectionIds = sections.map(s => s.id);
            
            // Delete pallet slots
            await supabase
              .from("pallet_slots")
              .delete()
              .in("section_id", sectionIds);

            // Delete pallets
            await supabase
              .from("pallets")
              .delete()
              .in("section_id", sectionIds);

            // Delete items
            await supabase
              .from("items")
              .delete()
              .in("section_id", sectionIds);
          }

          // 3. Delete warehouse sections
          const { error: sectionsError } = await supabase
            .from("warehouse_sections")
            .delete()
            .eq("warehouse_id", session.warehouse_id);

          if (sectionsError) {
            console.error(`Error deleting sections for warehouse ${session.warehouse_id}:`, sectionsError);
          }

          // 4. Delete the demo warehouse
          const { error: warehouseError } = await supabase
            .from("warehouses")
            .delete()
            .eq("id", session.warehouse_id);

          if (warehouseError) {
            console.error(`Error deleting warehouse ${session.warehouse_id}:`, warehouseError);
          }
        }

        // 5. Delete employees created by this demo user
        const { error: employeesError } = await supabase
          .from("employees")
          .delete()
          .eq("created_by", session.user_id);

        if (employeesError) {
          console.error(`Error deleting employees for user ${session.user_id}:`, employeesError);
        }

        // 6. Delete shipments created by this demo user
        const { data: shipments } = await supabase
          .from("shipments")
          .select("id")
          .eq("created_by", session.user_id);

        if (shipments && shipments.length > 0) {
          const shipmentIds = shipments.map(s => s.id);
          
          // Delete shipment items first
          await supabase
            .from("shipment_items")
            .delete()
            .in("shipment_id", shipmentIds);

          // Delete shipments
          await supabase
            .from("shipments")
            .delete()
            .eq("created_by", session.user_id);
        }

        // 7. Mark the demo session as inactive (instead of deleting for audit trail)
        const { error: sessionError } = await supabase
          .from("demo_sessions")
          .update({ is_active: false })
          .eq("id", session.id);

        if (sessionError) {
          console.error(`Error updating session ${session.id}:`, sessionError);
          errors.push(`Session ${session.id}: ${sessionError.message}`);
        } else {
          cleanedCount++;
          console.log(`Successfully cleaned up session ${session.id}`);
        }

        // 8. Delete the anonymous user from auth (optional - helps keep auth table clean)
        try {
          const { error: authError } = await supabase.auth.admin.deleteUser(session.user_id);
          if (authError) {
            console.error(`Error deleting auth user ${session.user_id}:`, authError);
          } else {
            console.log(`Deleted auth user ${session.user_id}`);
          }
        } catch (authErr) {
          console.error(`Failed to delete auth user:`, authErr);
        }

      } catch (sessionCleanupError) {
        console.error(`Error cleaning up session ${session.id}:`, sessionCleanupError);
        errors.push(`Session ${session.id}: ${String(sessionCleanupError)}`);
      }
    }

    // Also clean up very old inactive sessions (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: oldSessionsError } = await supabase
      .from("demo_sessions")
      .delete()
      .eq("is_active", false)
      .lt("created_at", sevenDaysAgo);

    if (oldSessionsError) {
      console.error("Error deleting old inactive sessions:", oldSessionsError);
    }

    console.log(`Demo cleanup complete. Cleaned: ${cleanedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${cleanedCount} expired demo sessions`,
        cleaned: cleanedCount,
        total: expiredSessions.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Demo cleanup error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

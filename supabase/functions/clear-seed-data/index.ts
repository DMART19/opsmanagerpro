import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SEED_TAG = "[SEED]";

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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    // Delete seed data in dependency order
    let deleted = {
      pallet_builds: 0,
      tasks: 0,
      employee_requirements: 0,
      requirement_definitions: 0,
      employees: 0,
      inventory: 0,
      containers: 0,
      sections: 0,
    };

    // 1. Saved pallet builds
    const { data: pb } = await admin
      .from("saved_pallet_builds")
      .delete()
      .eq("user_id", userId)
      .ilike("name", `${SEED_TAG}%`)
      .select("id");
    deleted.pallet_builds = pb?.length ?? 0;

    // 2. Tasks
    const { data: tk } = await admin
      .from("tasks")
      .delete()
      .eq("user_id", userId)
      .ilike("title", `${SEED_TAG}%`)
      .select("id");
    deleted.tasks = tk?.length ?? 0;

    // 3. Employee requirements (for seed employees)
    const { data: seedEmps } = await admin
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .eq("notes", SEED_TAG);

    if (seedEmps?.length) {
      const empIds = seedEmps.map((e: any) => e.id);
      const { data: er } = await admin
        .from("employee_requirements")
        .delete()
        .in("employee_id", empIds)
        .select("id");
      deleted.employee_requirements = er?.length ?? 0;
    }

    // 4. Requirement definitions
    const { data: rd } = await admin
      .from("requirement_definitions")
      .delete()
      .eq("created_by", userId)
      .ilike("name", `${SEED_TAG}%`)
      .select("id");
    deleted.requirement_definitions = rd?.length ?? 0;

    // 5. Employees
    const { data: em } = await admin
      .from("employees")
      .delete()
      .eq("user_id", userId)
      .eq("notes", SEED_TAG)
      .select("id");
    deleted.employees = em?.length ?? 0;

    // 6. Inventory
    const { data: inv } = await admin
      .from("cache_inventory")
      .delete()
      .eq("user_id", userId)
      .ilike("description", `${SEED_TAG}%`)
      .select("id");
    deleted.inventory = inv?.length ?? 0;

    // 7. Containers
    const { data: ctr } = await admin
      .from("cache_boxes")
      .delete()
      .eq("user_id", userId)
      .ilike("box_description", `${SEED_TAG}%`)
      .select("id");
    deleted.containers = ctr?.length ?? 0;

    // 8. Extra warehouse section
    const { data: sec } = await admin
      .from("warehouse_sections")
      .delete()
      .eq("created_by", userId)
      .eq("name", "Section B — Heavy Equipment")
      .select("id");
    deleted.sections = sec?.length ?? 0;

    // Mark as no longer seeded
    await admin
      .from("workspace_settings")
      .update({ has_seed_data: false })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ message: "Seed data cleared", deleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("clear-seed-data error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

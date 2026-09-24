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

    // Use service role for inserts
    const admin = createClient(supabaseUrl, serviceKey);

    // Check if already seeded
    const { data: ws } = await admin
      .from("workspace_settings")
      .select("has_seed_data")
      .eq("user_id", userId)
      .maybeSingle();

    if (ws?.has_seed_data) {
      return new Response(
        JSON.stringify({ message: "Already seeded", seeded: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Get existing warehouse & section ---
    const { data: warehouses } = await admin
      .from("warehouses")
      .select("id, name")
      .eq("created_by", userId)
      .limit(1);

    const warehouseId = warehouses?.[0]?.id;
    let sectionAId: string | null = null;

    if (warehouseId) {
      const { data: sections } = await admin
        .from("warehouse_sections")
        .select("id")
        .eq("warehouse_id", warehouseId)
        .limit(1);
      sectionAId = sections?.[0]?.id ?? null;
    }

    // --- Create additional warehouse section ---
    let sectionBId: string | null = null;
    if (warehouseId) {
      const { data: secB } = await admin
        .from("warehouse_sections")
        .insert({
          name: "Section B — Heavy Equipment",
          warehouse_id: warehouseId,
          created_by: userId,
        })
        .select("id")
        .single();
      sectionBId = secB?.id ?? null;
    }

    // --- Seed containers (cache_boxes) ---
    const containerDefs = [
      { box_number: "CTR-001", box_description: `${SEED_TAG} Safety Helmet Rack` },
      { box_number: "CTR-002", box_description: `${SEED_TAG} Medical Supplies Cabinet` },
      { box_number: "CTR-003", box_description: `${SEED_TAG} Tool Cage Alpha` },
    ];

    const { data: containers } = await admin
      .from("cache_boxes")
      .insert(
        containerDefs.map((c) => ({
          ...c,
          user_id: userId,
          section_id: sectionAId,
        }))
      )
      .select("id, box_number");

    const containerMap: Record<string, string> = {};
    containers?.forEach((c: any) => {
      containerMap[c.box_number] = c.id;
    });

    // --- Seed assets (cache_inventory) ---
    const assetDefs = [
      { description: `${SEED_TAG} Forklift A12`, asset_type: "item", section: "Section A", quantity_available: 1 },
      { description: `${SEED_TAG} Medical Kit #5`, asset_type: "item", section: "Section A", quantity_available: 12 },
      { description: `${SEED_TAG} Safety Harness Set`, asset_type: "item", section: "Section A", quantity_available: 8 },
      { description: `${SEED_TAG} Radio Headset Pack`, asset_type: "item", section: "Section A", quantity_available: 15 },
      { description: `${SEED_TAG} Emergency Generator`, asset_type: "item", section: "Section B", quantity_available: 2 },
      { description: `${SEED_TAG} Water Pump Unit`, asset_type: "item", section: "Section B", quantity_available: 3 },
      { description: `${SEED_TAG} Folding Cot Bundle`, asset_type: "item", section: "Section A", quantity_available: 20 },
      { description: `${SEED_TAG} LED Floodlight Kit`, asset_type: "item", section: "Section A", quantity_available: 6 },
      { description: `${SEED_TAG} PPE Starter Pack`, asset_type: "item", section: "Section A", quantity_available: 30 },
      { description: `${SEED_TAG} Tarp & Shelter Roll`, asset_type: "item", section: "Section B", quantity_available: 10 },
    ];

    await admin.from("cache_inventory").insert(
      assetDefs.map((a) => ({
        description: a.description,
        asset_type: a.asset_type,
        section: a.section,
        quantity_available: a.quantity_available,
        quantity_out: 0,
        user_id: userId,
      }))
    );

    // --- Seed team members (employees) ---
    const memberDefs = [
      { first_name: "Sarah", last_name: "Mitchell", position: "Operations Lead", email: "s.mitchell@example.com", notes: SEED_TAG },
      { first_name: "James", last_name: "Rivera", position: "Warehouse Technician", email: "j.rivera@example.com", notes: SEED_TAG },
      { first_name: "Priya", last_name: "Sharma", position: "Safety Officer", email: "p.sharma@example.com", notes: SEED_TAG },
    ];

    const { data: employees } = await admin
      .from("employees")
      .insert(memberDefs.map((m) => ({ ...m, user_id: userId })))
      .select("id, first_name");

    // --- Seed credentials (requirement_definitions + employee_requirements) ---
    const reqDefs = [
      { name: `${SEED_TAG} HAZWOPER 40-Hour`, description: "Hazardous waste operations certification", is_general: false, is_active: true },
      { name: `${SEED_TAG} First Aid / CPR`, description: "Basic first aid and CPR certification", is_general: true, is_active: true },
    ];

    const { data: requirements } = await admin
      .from("requirement_definitions")
      .insert(reqDefs.map((r) => ({ ...r, created_by: userId })))
      .select("id, name");

    // Assign credentials to first employee
    if (employees?.length && requirements?.length) {
      const assignmentRows = requirements.map((r: any) => ({
        employee_id: employees[0].id,
        requirement_id: r.id,
        status: "Compliant",
        issue_date: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
        expire_date: new Date(Date.now() + 270 * 86400000).toISOString().slice(0, 10),
        user_id: userId,
      }));
      await admin.from("employee_requirements").insert(assignmentRows);
    }

    // --- Seed calendar tasks ---
    const now = new Date();
    const taskDefs = [
      {
        title: `${SEED_TAG} Monthly safety inspection`,
        description: "Walk all sections, check fire extinguishers and exits.",
        start_date: new Date(now.getTime() + 2 * 86400000).toISOString(),
        status: "pending",
      },
      {
        title: `${SEED_TAG} Restock medical supplies`,
        description: "Order replacement items for Medical Kit #5.",
        start_date: new Date(now.getTime() + 5 * 86400000).toISOString(),
        status: "pending",
      },
      {
        title: `${SEED_TAG} Forklift maintenance check`,
        description: "Scheduled maintenance for Forklift A12.",
        start_date: new Date(now.getTime() + 7 * 86400000).toISOString(),
        status: "pending",
      },
    ];

    await admin
      .from("tasks")
      .insert(taskDefs.map((t) => ({ ...t, user_id: userId })));

    // --- Seed a saved pallet build ---
    const palletBuildData = {
      name: `${SEED_TAG} Standard Load Template`,
      user_id: userId,
      pallet_data: {
        palletType: { id: "builtin-gma-48x40", name: "Standard GMA 48×40", width: 48, length: 40, maxWeight: 2800 },
        placedCases: [
          { id: "seed-1", name: "Medical Kit", x: 0, y: 0, z: 0, width: 18, length: 14, height: 12, weight: 25, rotation: 0 },
          { id: "seed-2", name: "PPE Pack", x: 20, y: 0, z: 0, width: 16, length: 12, height: 10, weight: 18, rotation: 0 },
        ],
        totalWeight: 43,
      },
      is_template: false,
    };

    await admin.from("saved_pallet_builds").insert(palletBuildData);

    // --- Mark as seeded ---
    await admin
      .from("workspace_settings")
      .update({ has_seed_data: true })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ message: "Workspace seeded successfully", seeded: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("seed-workspace-data error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

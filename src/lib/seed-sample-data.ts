import { supabase } from "@/integrations/supabase/client";

const SAMPLE_TAG = { is_sample: true };

/**
 * Seeds a new workspace with example containers and assets
 * so the dashboard isn't empty on first login.
 * All records are tagged with { is_sample: true } in custom_data.
 */
export async function seedSampleData(userId: string) {
  try {
    // 1. Create container hierarchy: Rack A → Shelf 3 → Bin 12
    const { data: rackA, error: rackErr } = await supabase
      .from("cache_boxes")
      .insert({
        box_number: "Rack A",
        box_description: "Sample — Main storage rack",
        user_id: userId,
        custom_data: SAMPLE_TAG,
      })
      .select("id")
      .single();

    if (rackErr) throw rackErr;

    const { data: shelf3, error: shelfErr } = await supabase
      .from("cache_boxes")
      .insert({
        box_number: "Shelf 3",
        box_description: "Sample — Third shelf in Rack A",
        user_id: userId,
        custom_data: SAMPLE_TAG,
      })
      .select("id")
      .single();

    if (shelfErr) throw shelfErr;

    const { data: bin12, error: binErr } = await supabase
      .from("cache_boxes")
      .insert({
        box_number: "Bin 12",
        box_description: "Sample — Small parts bin on Shelf 3",
        user_id: userId,
        custom_data: SAMPLE_TAG,
      })
      .select("id")
      .single();

    if (binErr) throw binErr;

    // 2. Create container-type inventory records for nesting
    await supabase.from("cache_inventory").insert({
      description: "Shelf 3",
      asset_type: "container",
      container_id: rackA.id,
      user_id: userId,
      custom_data: SAMPLE_TAG,
      box_number: "Shelf 3",
    });

    await supabase.from("cache_inventory").insert({
      description: "Bin 12",
      asset_type: "container",
      container_id: shelf3.id,
      user_id: userId,
      custom_data: SAMPLE_TAG,
      box_number: "Bin 12",
    });

    // 3. Create example assets inside Bin 12
    const sampleAssets = [
      {
        description: "Calibration Tool",
        asset_type: "item" as const,
        quantity_available: 2,
        container_id: bin12.id,
        user_id: userId,
        section: "Rack A > Shelf 3 > Bin 12",
        custom_data: SAMPLE_TAG,
      },
      {
        description: "Inventory Scanner",
        asset_type: "item" as const,
        quantity_available: 4,
        container_id: bin12.id,
        user_id: userId,
        section: "Rack A > Shelf 3 > Bin 12",
        custom_data: SAMPLE_TAG,
      },
      {
        description: "Sensor Kit",
        asset_type: "item" as const,
        quantity_available: 1,
        container_id: bin12.id,
        user_id: userId,
        section: "Rack A > Shelf 3 > Bin 12",
        custom_data: SAMPLE_TAG,
      },
    ];

    const { error: assetsErr } = await supabase
      .from("cache_inventory")
      .insert(sampleAssets);

    if (assetsErr) throw assetsErr;

    // Mark workspace as having seed data
    await supabase
      .from("workspace_settings")
      .update({ has_seed_data: true })
      .eq("user_id", userId);
  } catch (err) {
    // Non-critical — log but don't block onboarding
    console.warn("Sample data seeding failed:", err);
  }
}

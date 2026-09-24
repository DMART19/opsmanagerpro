import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('authorization') ?? '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';
    if (!(bearer && bearer === serviceRoleKey) && !(cronSecret && providedSecret === cronSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active workspace owners
    const { data: plans, error: plansError } = await supabase
      .from('workspace_plans')
      .select('user_id')
      .eq('workspace_status', 'active');

    if (plansError) throw plansError;

    let created = 0;
    let failed = 0;

    for (const plan of (plans || [])) {
      try {
        // Check if a scheduled snapshot was already created in the last 11 hours
        const { data: recent } = await supabase
          .from('workspace_snapshots')
          .select('id')
          .eq('user_id', plan.user_id)
          .eq('snapshot_type', 'scheduled')
          .gte('created_at', new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recent && recent.length > 0) {
          continue; // Skip, already has a recent scheduled snapshot
        }

        const { error } = await supabase.rpc('create_workspace_snapshot', {
          p_user_id: plan.user_id,
          p_name: `Auto Snapshot – ${new Date().toISOString().split('T')[0]}`,
          p_snapshot_type: 'scheduled',
        });

        if (error) {
          console.error(`Snapshot failed for ${plan.user_id}:`, error.message);
          failed++;
        } else {
          created++;
        }
      } catch (err) {
        console.error(`Error processing ${plan.user_id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, created, failed, total_workspaces: plans?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Snapshot job error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

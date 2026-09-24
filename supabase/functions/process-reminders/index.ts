import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TaskReminder {
  id: string;
  title: string;
  user_id: string;
  start_date: string;
  start_time: string | null;
  reminder_enabled: boolean;
  last_reminder_sent: string | null;
}

interface NotificationSettingsRow {
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  checkout_alerts: boolean;
  maintenance_alerts: boolean;
  certification_expiry_alerts: boolean;
  task_due_alerts: boolean;
  expiry_warning_days: number;
}

const defaultSettings: Omit<NotificationSettingsRow, "user_id"> = {
  in_app_enabled: true,
  email_enabled: true,
  checkout_alerts: true,
  maintenance_alerts: true,
  certification_expiry_alerts: true,
  task_due_alerts: true,
  expiry_warning_days: 30,
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require shared secret to prevent unauthenticated public invocation.
    // Allow service-role JWT (used by Supabase Cron) OR an explicit CRON_SECRET header.
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const providedSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const isServiceRole = bearer && bearer === serviceRoleKey;
    const isValidSecret = cronSecret && providedSecret === cronSecret;
    if (!isServiceRole && !isValidSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

    // Load all notification settings so we can respect per-user preferences
    const { data: allSettings } = await supabase
      .from("notification_settings")
      .select("user_id, in_app_enabled, email_enabled, checkout_alerts, maintenance_alerts, certification_expiry_alerts, task_due_alerts, expiry_warning_days");

    const settingsMap = new Map<string, NotificationSettingsRow>();
    for (const row of (allSettings || []) as NotificationSettingsRow[]) {
      settingsMap.set(row.user_id, row);
    }

    const getUserSettings = (userId: string): NotificationSettingsRow => {
      return settingsMap.get(userId) || { user_id: userId, ...defaultSettings };
    };

    const notifications: Array<{
      user_id: string;
      title: string;
      message: string;
      notification_type: string;
      priority: string;
      related_entity_type: string;
      related_entity_id: string;
      action_url: string;
    }> = [];

    console.log(`[process-reminders] Starting at ${now.toISOString()}`);

    // 1. Task Reminders — only if user has task_due_alerts ON
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, user_id, start_date, start_time, reminder_enabled, last_reminder_sent")
      .eq("reminder_enabled", true)
      .gte("start_date", today)
      .lte("start_date", tomorrow)
      .not("user_id", "is", null);

    if (tasksError) {
      console.error("[process-reminders] Error fetching tasks:", tasksError);
    } else if (tasks) {
      console.log(`[process-reminders] Found ${tasks.length} tasks with reminders`);
      for (const task of tasks as TaskReminder[]) {
        const settings = getUserSettings(task.user_id);
        if (!settings.task_due_alerts || !settings.in_app_enabled) continue;

        if (task.last_reminder_sent && new Date(task.last_reminder_sent) > new Date(sixHoursAgo)) continue;

        const isToday = task.start_date === today;
        const timeInfo = task.start_time ? ` at ${task.start_time}` : "";

        notifications.push({
          user_id: task.user_id,
          title: isToday ? "Task Due Today" : "Task Due Tomorrow",
          message: `${task.title}${timeInfo}`,
          notification_type: "task_reminder",
          priority: isToday ? "high" : "normal",
          related_entity_type: "task",
          related_entity_id: task.id,
          action_url: `/calendar?task=${task.id}`,
        });

        await supabase.from("tasks").update({ last_reminder_sent: now.toISOString() }).eq("id", task.id);
      }
    }

    // 2. Expiring Credentials — respect certification_expiry_alerts + per-user expiry_warning_days
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    // Use the maximum possible warning window (90 days) so we fetch all candidates,
    // then filter per-user based on their expiry_warning_days setting
    const maxWarningDays = 90;
    const maxWarningDate = new Date(now.getTime() + maxWarningDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: credentials, error: credentialsError } = await supabase
      .from("employee_requirements")
      .select(`
        id, employee_id, expire_date, requirement_id, user_id, status,
        employee:employees!employee_id(first_name, last_name),
        requirement:requirement_definitions!requirement_id(title)
      `)
      .not("expire_date", "is", null)
      .gte("expire_date", ninetyDaysAgo)
      .lte("expire_date", maxWarningDate)
      .not("user_id", "is", null);

    if (credentialsError) {
      console.error("[process-reminders] Error fetching credentials:", credentialsError);
    } else if (credentials) {
      console.log(`[process-reminders] Found ${credentials.length} expiring credentials`);
      for (const cred of credentials) {
        if (!cred.employee || !cred.requirement || !cred.user_id) continue;

        const settings = getUserSettings(cred.user_id);
        if (!settings.certification_expiry_alerts || !settings.in_app_enabled) continue;

        const status = (cred.status || "").toLowerCase();
        if (status === "compliant" || status === "completed" || status === "renewed") continue;

        const expireDate = new Date(cred.expire_date!);
        const isExpired = expireDate < now;
        const daysUntil = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Only warn if within this user's configured warning window (or already expired)
        if (!isExpired && daysUntil > settings.expiry_warning_days) continue;

        const employeeName = `${(cred.employee as any).first_name} ${(cred.employee as any).last_name}`;
        const reqTitle = (cred.requirement as any).title;

        notifications.push({
          user_id: cred.user_id,
          title: isExpired ? "Credential Expired" : "Credential Expiring Soon",
          message: isExpired
            ? `${reqTitle} for ${employeeName} has expired`
            : `${reqTitle} for ${employeeName} expires in ${daysUntil} days`,
          notification_type: "credential_expiry",
          priority: isExpired ? "high" : (daysUntil <= 7 ? "high" : "normal"),
          related_entity_type: "employee_requirement",
          related_entity_id: cred.id,
          action_url: `/people?member=${cred.employee_id}&tab=requirements`,
        });
      }
    }

    // 3. Upcoming Maintenance — respect maintenance_alerts
    const { data: maintenance, error: maintenanceError } = await supabase
      .from("maintenance_records")
      .select(`
        id, equipment_id, next_maintenance_date, maintenance_type,
        equipment:equipment!equipment_id(name, user_id)
      `)
      .not("next_maintenance_date", "is", null)
      .gte("next_maintenance_date", today)
      .lte("next_maintenance_date", sevenDaysFromNow);

    if (maintenanceError) {
      console.error("[process-reminders] Error fetching maintenance:", maintenanceError);
    } else if (maintenance) {
      console.log(`[process-reminders] Found ${maintenance.length} upcoming maintenance`);
      for (const record of maintenance) {
        if (!record.equipment || !(record.equipment as any).user_id) continue;

        const userId = (record.equipment as any).user_id;
        const settings = getUserSettings(userId);
        if (!settings.maintenance_alerts || !settings.in_app_enabled) continue;

        const maintenanceDate = new Date(record.next_maintenance_date);
        const isToday = record.next_maintenance_date === today;
        const daysUntil = Math.ceil((maintenanceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        notifications.push({
          user_id: userId,
          title: isToday ? "Maintenance Due Today" : "Maintenance Coming Up",
          message: `${(record.equipment as any).name} - ${record.maintenance_type}${isToday ? "" : ` in ${daysUntil} days`}`,
          notification_type: "maintenance_reminder",
          priority: isToday ? "high" : "normal",
          related_entity_type: "maintenance_record",
          related_entity_id: record.id,
          action_url: `/inventory?highlight=${record.equipment_id}`,
        });
      }
    }

    // 4. Overdue Checkouts — respect checkout_alerts
    const { data: checkouts, error: checkoutsError } = await supabase
      .from("equipment_checkouts")
      .select(`
        id, equipment_id, due_date,
        equipment:equipment!equipment_id(name, user_id),
        staff:staff!staff_id(first_name, last_name)
      `)
      .not("due_date", "is", null)
      .lt("due_date", today)
      .eq("status", "checked_out");

    if (checkoutsError) {
      console.error("[process-reminders] Error fetching checkouts:", checkoutsError);
    } else if (checkouts) {
      console.log(`[process-reminders] Found ${checkouts.length} overdue checkouts`);
      for (const checkout of checkouts) {
        if (!checkout.equipment || !(checkout.equipment as any).user_id) continue;

        const userId = (checkout.equipment as any).user_id;
        const settings = getUserSettings(userId);
        if (!settings.checkout_alerts || !settings.in_app_enabled) continue;

        const dueDate = new Date(checkout.due_date);
        const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const staffName = checkout.staff
          ? `${(checkout.staff as any).first_name} ${(checkout.staff as any).last_name}`
          : "Unknown";

        notifications.push({
          user_id: userId,
          title: "Equipment Overdue",
          message: `${(checkout.equipment as any).name} checked out by ${staffName} is ${daysOverdue} day(s) overdue`,
          notification_type: "checkout_overdue",
          priority: "high",
          related_entity_type: "equipment_checkout",
          related_entity_id: checkout.id,
          action_url: `/inventory?highlight=${checkout.equipment_id}`,
        });
      }
    }

    // 5. Low Stock Alerts (always on — not gated by a specific toggle)
    const { data: lowStockItems, error: lowStockError } = await supabase
      .from("cache_inventory")
      .select("id, description, quantity_available, low_stock_threshold, critical_stock_threshold, user_id")
      .not("user_id", "is", null);

    if (lowStockError) {
      console.error("[process-reminders] Error fetching inventory:", lowStockError);
    } else if (lowStockItems) {
      const lowStockAlerts = lowStockItems.filter(item => {
        const available = item.quantity_available ?? 0;
        const lowThreshold = item.low_stock_threshold ?? 5;
        const criticalThreshold = item.critical_stock_threshold ?? 0;
        return available <= lowThreshold || available <= criticalThreshold;
      });

      console.log(`[process-reminders] Found ${lowStockAlerts.length} low stock items`);
      for (const item of lowStockAlerts) {
        if (!item.user_id) continue;

        const settings = getUserSettings(item.user_id);
        if (!settings.in_app_enabled) continue;

        const available = item.quantity_available ?? 0;
        const criticalThreshold = item.critical_stock_threshold ?? 0;
        const isCritical = available <= criticalThreshold;

        notifications.push({
          user_id: item.user_id,
          title: isCritical ? "Critical Stock Level" : "Low Stock Alert",
          message: `${item.description || "Item"} has only ${available} unit(s) remaining`,
          notification_type: "low_stock",
          priority: isCritical ? "high" : "normal",
          related_entity_type: "cache_inventory",
          related_entity_id: item.id,
          action_url: `/inventory?highlight=${item.id}`,
        });
      }
    }

    // Deduplicate (same as before)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const relevantUserIds = [...new Set(notifications.map(n => n.user_id))];

    let recentSet = new Set<string>();
    if (relevantUserIds.length > 0) {
      const { data: recentNotifications } = await supabase
        .from("user_notifications")
        .select("related_entity_id, notification_type, user_id")
        .gte("created_at", oneDayAgo)
        .in("user_id", relevantUserIds);

      recentSet = new Set(
        (recentNotifications || []).map(n => `${n.user_id}-${n.notification_type}-${n.related_entity_id}`)
      );
    }

    const newNotifications = notifications.filter(
      n => !recentSet.has(`${n.user_id}-${n.notification_type}-${n.related_entity_id}`)
    );

    console.log(`[process-reminders] Creating ${newNotifications.length} new notifications (${notifications.length - newNotifications.length} deduplicated)`);

    if (newNotifications.length > 0) {
      const { error: insertError } = await supabase
        .from("user_notifications")
        .insert(newNotifications);

      if (insertError) {
        console.error("[process-reminders] Error inserting notifications:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: {
          tasks: tasks?.length || 0,
          credentials: credentials?.length || 0,
          maintenance: maintenance?.length || 0,
          checkouts: checkouts?.length || 0,
          lowStock: lowStockItems?.length || 0,
        },
        notifications_created: newNotifications.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[process-reminders] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

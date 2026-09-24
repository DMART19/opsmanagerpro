import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Bell, Mail, Calendar, AlertTriangle, Save, Loader2, Play, CheckCircle, TestTube2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  channels: string[];
  enabled: boolean;
  icon: any;
  settingKey: string;
}

const baseAutomationRules: Omit<AutomationRule, 'enabled'>[] = [
  {
    id: "1",
    name: "Asset Checkout Alerts",
    description: "Notify when equipment checkout is overdue",
    trigger: "When checkout is past due date",
    channels: ["email", "in-app"],
    icon: Calendar,
    settingKey: "checkout_alerts",
  },
  {
    id: "2",
    name: "Certification Expiry Alerts",
    description: "Alert when employee certifications are expiring soon",
    trigger: "Based on expiry warning lead time",
    channels: ["email", "in-app"],
    icon: AlertTriangle,
    settingKey: "certification_expiry_alerts",
  },
  {
    id: "3",
    name: "Maintenance Alerts",
    description: "Schedule maintenance notifications based on service intervals",
    trigger: "7 days before due",
    channels: ["email", "in-app"],
    icon: Bell,
    settingKey: "maintenance_alerts",
  },
  {
    id: "4",
    name: "Task Reminder Alerts",
    description: "Notify when tasks are due today or tomorrow",
    trigger: "Day before and day of task",
    channels: ["in-app"],
    icon: Calendar,
    settingKey: "task_due_alerts",
  },
];

export const AutomationTab = () => {
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<Date | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<Record<string, any>>({
    checkout_alerts: true,
    certification_expiry_alerts: true,
    maintenance_alerts: true,
    task_due_alerts: true,
    email_enabled: true,
    in_app_enabled: true,
    expiry_warning_days: 30,
  });

  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("notification_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          setNotificationSettings({
            checkout_alerts: data.checkout_alerts ?? true,
            certification_expiry_alerts: data.certification_expiry_alerts ?? true,
            maintenance_alerts: data.maintenance_alerts ?? true,
            task_due_alerts: data.task_due_alerts ?? true,
            email_enabled: data.email_enabled ?? true,
            in_app_enabled: data.in_app_enabled ?? true,
            expiry_warning_days: data.expiry_warning_days ?? 30,
          });
        } else {
          // No row exists — create defaults
          const defaults = {
            user_id: user.id,
            in_app_enabled: true,
            email_enabled: true,
            checkout_alerts: true,
            maintenance_alerts: true,
            certification_expiry_alerts: true,
            task_due_alerts: true,
            expiry_warning_days: 30,
          };
          await supabase.from("notification_settings").upsert(defaults, { onConflict: "user_id" });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const automationRules: AutomationRule[] = baseAutomationRules.map(rule => ({
    ...rule,
    enabled: notificationSettings[rule.settingKey] ?? true,
  }));

  const handleToggle = (settingKey: string, enabled: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [settingKey]: enabled }));
    setHasChanges(true);
  };

  const handleExpiryDaysChange = (value: number[]) => {
    setNotificationSettings(prev => ({ ...prev, expiry_warning_days: value[0] }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          ...notificationSettings,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your alert preferences have been updated and are now active.",
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProcessReminders = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-reminders");

      if (error) throw error;

      setLastProcessed(new Date());
      toast({
        title: "Reminders processed",
        description: `Created ${data.notifications_created} new notifications.`,
      });
    } catch (error: any) {
      toast({
        title: "Error processing reminders",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check which delivery methods are enabled
      const inAppOn = notificationSettings.in_app_enabled;
      const emailOn = notificationSettings.email_enabled;

      if (!inAppOn && !emailOn) {
        toast({
          title: "All delivery methods are off",
          description: "Enable In-App or Email alerts to receive test notifications.",
          variant: "destructive",
        });
        return;
      }

      if (inAppOn) {
        // Create a real test notification in the database
        const { error } = await supabase.from("user_notifications").insert({
          user_id: user.id,
          title: "Test Alert",
          message: "This is a test notification confirming your alert settings are working correctly.",
          notification_type: "test",
          priority: "normal",
          related_entity_type: "test",
          related_entity_id: user.id,
          action_url: "/settings",
        });

        if (error) throw error;
      }

      const channels = [
        inAppOn && "in-app",
        emailOn && "email (when configured)",
      ].filter(Boolean).join(" and ");

      toast({
        title: "Test alert sent",
        description: `A test notification was delivered via ${channels}. Check your notification bell.`,
      });
    } catch (error: any) {
      toast({
        title: "Test alert failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </Card>
      </div>
    );
  }

  const expiryDays = notificationSettings.expiry_warning_days ?? 30;

  return (
    <div className="space-y-6">
      <Alert className="border-accent/50 bg-accent/10">
        <Bell className="h-4 w-4 text-accent-foreground" />
        <AlertDescription className="text-accent-foreground">
          These settings control which alerts are generated and how they are delivered. Changes take effect immediately after saving.
        </AlertDescription>
      </Alert>

      {/* Delivery Methods */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground">Delivery Methods</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Control how notifications reach you. Disabling both will fully suppress all alerts.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">In-App Alerts</div>
                <div className="text-sm text-muted-foreground">Show notifications in the notification bell</div>
              </div>
            </div>
            <Switch 
              checked={notificationSettings.in_app_enabled ?? true} 
              onCheckedChange={(checked) => handleToggle("in_app_enabled", checked)} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">Email Alerts</div>
                <div className="text-sm text-muted-foreground">Send notifications via email</div>
              </div>
            </div>
            <Switch 
              checked={notificationSettings.email_enabled ?? true} 
              onCheckedChange={(checked) => handleToggle("email_enabled", checked)} 
            />
          </div>
        </div>

        {!notificationSettings.in_app_enabled && !notificationSettings.email_enabled && (
          <Alert className="mt-4 border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Both delivery methods are disabled. No alerts will be generated or delivered.
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Alert Types */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Alert Types</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enable or disable specific alert categories
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-2">Save Changes</span>
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {automationRules.map((rule) => {
            const Icon = rule.icon;
            return (
              <Card key={rule.id} className="p-4 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{rule.name}</h4>
                        {rule.enabled ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Trigger Condition</Label>
                          <Input
                            value={rule.settingKey === "certification_expiry_alerts" ? `${expiryDays} days before expiration` : rule.trigger}
                            className="h-8 text-sm"
                            disabled
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Notification Channels</Label>
                          <div className="flex gap-2">
                            {rule.channels.includes("email") && notificationSettings.email_enabled && (
                              <Badge variant="outline" className="text-xs">
                                <Mail className="h-3 w-3 mr-1" />
                                Email
                              </Badge>
                            )}
                            {rule.channels.includes("in-app") && notificationSettings.in_app_enabled && (
                              <Badge variant="outline" className="text-xs">
                                <Bell className="h-3 w-3 mr-1" />
                                In-App
                              </Badge>
                            )}
                            {!notificationSettings.email_enabled && !notificationSettings.in_app_enabled && (
                              <span className="text-xs text-muted-foreground italic">No channels active</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => handleToggle(rule.settingKey, checked)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Timing */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground">Timing</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Control when alerts are triggered relative to expiration dates
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Expiry Warning Lead Time</div>
                <div className="text-sm text-muted-foreground">
                  How far in advance to alert about expiring credentials
                </div>
              </div>
              <Badge variant="secondary" className="text-sm font-mono px-3">
                {expiryDays} days
              </Badge>
            </div>
            <Slider
              value={[expiryDays]}
              onValueChange={handleExpiryDaysChange}
              min={7}
              max={90}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>7 days</span>
              <span>30 days</span>
              <span>60 days</span>
              <span>90 days</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground">Actions</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Test your settings or manually trigger the alert engine
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Test Alert */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-foreground">Test Alert</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Send a test notification to confirm your settings work
              </p>
            </div>
            <Button variant="outline" onClick={handleTestAlert} disabled={testing} size="sm">
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <TestTube2 className="h-4 w-4 mr-2" />
              )}
              Test
            </Button>
          </div>

          {/* Process Reminders */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-foreground">Process Reminders</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manually run the alert engine now
              </p>
              {lastProcessed && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last run: {lastProcessed.toLocaleTimeString()}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleProcessReminders} disabled={processing} size="sm">
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run
            </Button>
          </div>
        </div>
      </Card>

      {/* Floating save bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t shadow-lg animate-in slide-in-from-bottom-4 duration-300">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">You have unsaved changes to your alert preferences.</p>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

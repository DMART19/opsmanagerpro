import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import type { NotificationSettings } from "@/contexts/SettingsContext";

interface NotificationsTabProps {
  settings: NotificationSettings;
  onSave: (settings: Partial<NotificationSettings>) => Promise<boolean>;
  saving: boolean;
}

const ToggleRow = ({ 
  label, 
  description, 
  checked, 
  onCheckedChange,
  last = false,
}: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onCheckedChange: (val: boolean) => void;
  last?: boolean;
}) => (
  <div className={`flex items-center justify-between gap-3 py-3 ${!last ? 'border-b border-border/30' : ''}`}>
    <div className="min-w-0">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export const NotificationsTab = ({ settings, onSave, saving }: NotificationsTabProps) => {
  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleToggle = (field: keyof NotificationSettings, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleChange = (field: keyof NotificationSettings, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const success = await onSave(formData);
    if (success) setHasChanges(false);
  };

  const handleCancel = () => {
    setFormData(settings);
    setHasChanges(false);
  };

  return (
    <div className="space-y-3">
      {/* Delivery Methods */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
          Delivery Methods
        </h3>
        <Card className="px-4">
          <ToggleRow
            label="In-App Alerts"
            description="Notifications appear inside the app"
            checked={formData.in_app_enabled}
            onCheckedChange={(val) => handleToggle("in_app_enabled", val)}
          />
          <ToggleRow
            label="Email Alerts"
            description="Send notifications to your email"
            checked={formData.email_enabled}
            onCheckedChange={(val) => handleToggle("email_enabled", val)}
            last
          />
        </Card>
      </div>

      {/* What to notify about */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
          Alert Types
        </h3>
        <Card className="px-4">
          <ToggleRow
            label="Asset Checkout"
            description="Check-in/out and overdue alerts"
            checked={formData.checkout_alerts}
            onCheckedChange={(val) => handleToggle("checkout_alerts", val)}
          />
          <ToggleRow
            label="Maintenance"
            description="Service and repair updates"
            checked={formData.maintenance_alerts}
            onCheckedChange={(val) => handleToggle("maintenance_alerts", val)}
          />
          <ToggleRow
            label="Certification Expiry"
            description="Team credential warnings"
            checked={formData.certification_expiry_alerts}
            onCheckedChange={(val) => handleToggle("certification_expiry_alerts", val)}
          />
          <ToggleRow
            label="Task Reminders"
            description="Upcoming and overdue tasks"
            checked={formData.task_due_alerts}
            onCheckedChange={(val) => handleToggle("task_due_alerts", val)}
            last
          />
        </Card>
      </div>

      {/* Timing */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
          Timing
        </h3>
        <Card className="p-4 space-y-2">
          <Label className="text-sm font-medium">Expiry Warning Lead Time</Label>
          <Select
            value={String(formData.expiry_warning_days)}
            onValueChange={(val) => handleChange("expiry_warning_days", parseInt(val))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days before</SelectItem>
              <SelectItem value="14">14 days before</SelectItem>
              <SelectItem value="30">30 days before</SelectItem>
              <SelectItem value="60">60 days before</SelectItem>
              <SelectItem value="90">90 days before</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">How early to warn about expiring credentials</p>
        </Card>
      </div>

      {/* Save Bar */}
      {hasChanges && (
        <div className="flex items-center justify-between gap-3 p-3 bg-card border rounded-lg animate-fade-in">
          <p className="text-sm text-muted-foreground">Unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

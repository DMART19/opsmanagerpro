import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, XCircle, Clock, Bell, Save, Loader2 } from "lucide-react";
import type { ComplianceSettings } from "@/hooks/use-user-settings";

interface ComplianceTabProps {
  settings: ComplianceSettings;
  onSave: (settings: Partial<ComplianceSettings>) => Promise<boolean>;
  saving: boolean;
}

export const ComplianceTab = ({ settings, onSave, saving }: ComplianceTabProps) => {
  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof ComplianceSettings, value: string | number | boolean) => {
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

  const severityOptions = [
    { value: "low", label: "Low", color: "bg-muted text-muted-foreground" },
    { value: "medium", label: "Medium", color: "bg-warning/10 text-warning" },
    { value: "warning", label: "Warning", color: "bg-amber-500/10 text-amber-600" },
    { value: "critical", label: "Critical", color: "bg-destructive/10 text-destructive" },
  ];

  const getSeverityBadge = (severity: string) => {
    const option = severityOptions.find(o => o.value === severity);
    return (
      <Badge variant="outline" className={option?.color || ""}>
        {option?.label || severity}
      </Badge>
    );
  };

  const thresholds = [
    { 
      id: "warning_threshold_days", 
      icon: AlertTriangle, 
      iconColor: "text-warning", 
      bgColor: "bg-warning/10",
      title: "Warning Threshold", 
      description: "When to show 'Expiring Soon'",
      options: [
        { value: "7", label: "7 days" },
        { value: "14", label: "14 days" },
        { value: "30", label: "30 days" },
        { value: "60", label: "60 days" },
        { value: "90", label: "90 days" },
      ]
    },
    { 
      id: "critical_threshold_days", 
      icon: XCircle, 
      iconColor: "text-destructive", 
      bgColor: "bg-destructive/10",
      title: "Critical Threshold", 
      description: "When to trigger urgent alerts",
      options: [
        { value: "1", label: "1 day" },
        { value: "3", label: "3 days" },
        { value: "7", label: "7 days" },
        { value: "14", label: "14 days" },
      ]
    },
  ];

  const severitySettings = [
    { id: "expired_severity", icon: Clock, iconColor: "text-destructive", bgColor: "bg-destructive/10", title: "Expired", description: "Already-expired credentials" },
    { id: "expiring_soon_severity", icon: AlertTriangle, iconColor: "text-warning", bgColor: "bg-warning/10", title: "Expiring Soon", description: "Approaching expiration" },
    { id: "missing_credential_severity", icon: ShieldCheck, iconColor: "text-muted-foreground", bgColor: "bg-muted", title: "Missing", description: "Required but not submitted" },
  ];

  return (
    <div className="space-y-4">
      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-lg">
          <p className="text-sm text-muted-foreground">Unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-[100px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
            </Button>
          </div>
        </div>
      )}

      {/* Expiration Thresholds */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Expiration Thresholds
        </h3>
        {thresholds.map((threshold) => {
          const Icon = threshold.icon;
          return (
            <Card key={threshold.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-lg ${threshold.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${threshold.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <Label className="font-medium">{threshold.title}</Label>
                    <p className="text-xs text-muted-foreground">{threshold.description}</p>
                  </div>
                  <Select
                    value={String(formData[threshold.id as keyof ComplianceSettings])}
                    onValueChange={(val) => handleChange(threshold.id as keyof ComplianceSettings, parseInt(val))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {threshold.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Severity Levels */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Alert Severity Levels
        </h3>
        {severitySettings.map((setting) => {
          const Icon = setting.icon;
          return (
            <Card key={setting.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-lg ${setting.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${setting.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="font-medium">{setting.title}</Label>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    </div>
                    {getSeverityBadge(formData[setting.id as keyof ComplianceSettings] as string)}
                  </div>
                  <Select
                    value={formData[setting.id as keyof ComplianceSettings] as string}
                    onValueChange={(val) => handleChange(setting.id as keyof ComplianceSettings, val)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {severityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Auto Notify */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Automation
        </h3>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <Label className="font-medium">Auto-Notify Expiring</Label>
                <p className="text-xs text-muted-foreground">Send automatic reminders</p>
              </div>
            </div>
            <Switch
              checked={formData.auto_notify_expiring}
              onCheckedChange={(val) => handleChange("auto_notify_expiring", val)}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

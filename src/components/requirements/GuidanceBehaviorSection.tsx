/**
 * GuidanceBehaviorSection — Guidance sensitivity and feature flags.
 * Controls: sensitivity (aggressive/balanced/minimal), explanations, idle hints, modal simplification.
 */
import type { GuidanceSettings } from "@/hooks/use-requirement-admin";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";

interface GuidanceBehaviorSectionProps {
  settings: GuidanceSettings;
  onChange: (settings: GuidanceSettings) => void;
}

export function GuidanceBehaviorSection({ settings, onChange }: GuidanceBehaviorSectionProps) {
  const update = (patch: Partial<GuidanceSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="space-y-5">
      {/* Sensitivity */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Sensitivity</Label>
        <Select
          value={settings.sensitivity}
          onValueChange={(v) => update({ sensitivity: v as GuidanceSettings["sensitivity"] })}
        >
          <SelectTrigger className="h-9 w-full max-w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aggressive">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" />
                Aggressive
              </div>
            </SelectItem>
            <SelectItem value="balanced">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Balanced
              </div>
            </SelectItem>
            <SelectItem value="minimal">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Minimal
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controls how prominently guidance appears to users
        </p>
      </div>

      <Separator />

      {/* Feature flags */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Feature Flags</Label>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Explanations</p>
            <p className="text-xs text-muted-foreground">Show "why this matters" hints</p>
          </div>
          <Switch
            checked={settings.enable_explanations}
            onCheckedChange={(v) => update({ enable_explanations: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Idle hints</p>
            <p className="text-xs text-muted-foreground">Show guidance after user inactivity</p>
          </div>
          <Switch
            checked={settings.enable_idle_hints}
            onCheckedChange={(v) => update({ enable_idle_hints: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Modal simplification</p>
            <p className="text-xs text-muted-foreground">Collapse advanced fields during active requirements</p>
          </div>
          <Switch
            checked={settings.enable_modal_simplification}
            onCheckedChange={(v) => update({ enable_modal_simplification: v })}
          />
        </div>
      </div>
    </div>
  );
}

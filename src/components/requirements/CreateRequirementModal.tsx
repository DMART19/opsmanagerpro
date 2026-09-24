import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X } from "lucide-react";
import { useRequirementAdmin, type RequirementConfig } from "@/hooks/use-requirement-admin";
import { toast } from "sonner";

const GROUPS = [
  { value: "assets", label: "Assets" },
  { value: "calendar", label: "Calendar" },
  { value: "team", label: "Team" },
  { value: "custom", label: "Custom" },
];

const CHECK_KEY_OPTIONS = [
  { value: "items_exist", label: "Items exist" },
  { value: "containers_exist", label: "Containers exist" },
  { value: "items_assigned", label: "Assignment exists" },
  { value: "tasks_exist", label: "Task exists" },
  { value: "team_members_exist", label: "Team members exist" },
  { value: "credentials_assigned", label: "Credentials assigned" },
  { value: "_custom", label: "Custom checkKey" },
];

const RESOLVE_OPTIONS = [
  { value: "add_container_button", label: "Add Container Button" },
  { value: "add_item_button", label: "Add Item Button" },
  { value: "assign_item_action", label: "Assign Item Action" },
  { value: "add_task_button", label: "Add Task Button" },
  { value: "add_team_member_button", label: "Add Team Member Button" },
  { value: "assign_credential_action", label: "Assign Credential Action" },
];

interface CreateRequirementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRequirementModal({ open, onOpenChange }: CreateRequirementModalProps) {
  const { configs, saveConfigs } = useRequirementAdmin();

  // Form state
  const [label, setLabel] = useState("");
  const [explanation, setExplanation] = useState("");
  const [group, setGroup] = useState("");
  const [resolve, setResolve] = useState("");
  const [checkKeySelection, setCheckKeySelection] = useState("");
  const [customCheckKey, setCustomCheckKey] = useState("");
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [required, setRequired] = useState(true);
  const [isCore, setIsCore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resolvedCheckKey = checkKeySelection === "_custom" ? customCheckKey : checkKeySelection;

  const nextPriority = useMemo(() => {
    if (!configs || configs.length === 0) return 1;
    return Math.max(...configs.map(c => c.priority)) + 1;
  }, [configs]);

  const requirementId = useMemo(() => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 40) || "new_requirement";
  }, [label]);

  const resolveNotFound = resolve && !RESOLVE_OPTIONS.some(o => o.value === resolve);

  const resetForm = useCallback(() => {
    setLabel("");
    setExplanation("");
    setGroup("");
    setResolve("");
    setCheckKeySelection("");
    setCustomCheckKey("");
    setDependsOn([]);
    setRequired(true);
    setIsCore(false);
  }, []);

  const canSubmit =
    label.trim().length > 0 &&
    explanation.trim().length > 0 &&
    group.length > 0 &&
    resolve.length > 0 &&
    resolvedCheckKey.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    try {
      const newConfig: RequirementConfig = {
        id: "",
        user_id: "",
        requirement_id: requirementId,
        enabled: true,
        priority: nextPriority,
        label: label.trim(),
        explanation: explanation.trim(),
        depends_on: dependsOn,
        required,
        is_core: isCore,
        group,
        check_key: resolvedCheckKey,
        resolve,
        created_at: "",
        updated_at: "",
      };

      const updatedConfigs = [...configs, newConfig];

      await saveConfigs.mutateAsync({
        configs: updatedConfigs,
        description: `Added requirement: ${label.trim()}`,
      });

      toast.success("Requirement created", {
        description: `"${label.trim()}" added at priority ${nextPriority}`,
      });

      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to create requirement", {
        description: err?.message || "Check fields and try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDependency = (depId: string) => {
    setDependsOn(prev =>
      prev.includes(depId) ? prev.filter(d => d !== depId) : [...prev, depId]
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Requirement</DialogTitle>
          <DialogDescription>
            Define what the system should guide the user to do.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-1 pr-1">
          {/* 1. Label */}
          <div className="space-y-1.5">
            <Label htmlFor="req-label" className="text-xs font-medium">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="req-label"
              placeholder="e.g. Add Item"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>

          {/* 2. Explanation */}
          <div className="space-y-1.5">
            <Label htmlFor="req-explanation" className="text-xs font-medium">
              Explanation <span className="text-destructive">*</span>
            </Label>
            <Input
              id="req-explanation"
              placeholder="What does this action do?"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="h-9"
            />
          </div>

          {/* 3. Group */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Group <span className="text-destructive">*</span>
            </Label>
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map(g => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Resolve (Target Element) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Target Element <span className="text-destructive">*</span>
            </Label>
            <Select value={resolve} onValueChange={setResolve}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select target element" />
              </SelectTrigger>
              <SelectContent>
                {RESOLVE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              This is the UI element the system will highlight.
            </p>
            {resolveNotFound && (
              <div className="flex items-center gap-1.5 text-[11px] text-destructive/80">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Element not registered — requirement will still be created.
              </div>
            )}
          </div>

          {/* 5. Check Key (Completion Logic) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              When is this complete? <span className="text-destructive">*</span>
            </Label>
            <Select value={checkKeySelection} onValueChange={setCheckKeySelection}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select completion condition" />
              </SelectTrigger>
              <SelectContent>
                {CHECK_KEY_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {checkKeySelection === "_custom" && (
              <Input
                placeholder="e.g. custom_check_key"
                value={customCheckKey}
                onChange={(e) => setCustomCheckKey(e.target.value)}
                className="h-9 mt-2"
              />
            )}
          </div>

          {/* 6. Dependencies */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Depends On</Label>
            {configs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {configs.map(c => {
                  const selected = dependsOn.includes(c.requirement_id);
                  return (
                    <Badge
                      key={c.requirement_id}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer text-[11px] transition-colors"
                      onClick={() => toggleDependency(c.requirement_id)}
                    >
                      {c.label}
                      {selected && <X className="h-2.5 w-2.5 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">No existing requirements to depend on.</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Only show this step after these are complete.
            </p>
          </div>

          {/* 7. Priority (auto) */}
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              Priority will be set automatically to <span className="font-semibold text-foreground">{nextPriority}</span>
            </p>
          </div>

          {/* 8. Flags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Required</p>
                <p className="text-[11px] text-muted-foreground">Must be completed for setup</p>
              </div>
              <Switch checked={required} onCheckedChange={setRequired} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Core</p>
                <p className="text-[11px] text-muted-foreground">Cannot be deleted or disabled</p>
              </div>
              <Switch checked={isCore} onCheckedChange={setIsCore} />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Creating…" : "Create Requirement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

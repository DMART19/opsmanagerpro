/**
 * RequirementTemplatesModal — Apply pre-built requirement templates instantly.
 * Avoids duplicates, assigns correct priorities, and syncs all 3 stages.
 */
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useRequirementAdmin, type RequirementConfig } from "@/hooks/use-requirement-admin";
import { toast } from "sonner";
import {
  Box,
  CalendarDays,
  Check,
  Loader2,
  Users,
  Zap,
} from "lucide-react";

// ─── Template Definitions ─────────────────────────────────────────

interface TemplateRequirement {
  requirement_id: string;
  label: string;
  explanation: string;
  group: string;
  check_key: string;
  resolve: string;
  depends_on: string[];
  required: boolean;
  is_core: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requirements: TemplateRequirement[];
}

const TEMPLATES: Template[] = [
  {
    id: "assets",
    name: "Assets",
    description: "Container, item, and assignment tracking",
    icon: <Box className="h-5 w-5" />,
    requirements: [
      {
        requirement_id: "has_container",
        label: "Create Container",
        explanation: "Create a place to organize your items",
        group: "assets",
        check_key: "containers_exist",
        resolve: "add_container_button",
        depends_on: [],
        required: true,
        is_core: true,
      },
      {
        requirement_id: "has_item",
        label: "Add Item",
        explanation: "Track inventory items",
        group: "assets",
        check_key: "items_exist",
        resolve: "add_item_button",
        depends_on: ["has_container"],
        required: true,
        is_core: true,
      },
      {
        requirement_id: "has_assignment",
        label: "Assign Item",
        explanation: "Link items to containers",
        group: "assets",
        check_key: "items_assigned",
        resolve: "assign_item_action",
        depends_on: ["has_container", "has_item"],
        required: true,
        is_core: true,
      },
    ],
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Task scheduling and management",
    icon: <CalendarDays className="h-5 w-5" />,
    requirements: [
      {
        requirement_id: "has_task",
        label: "Add Task",
        explanation: "Schedule your first task",
        group: "calendar",
        check_key: "tasks_exist",
        resolve: "add_task_button",
        depends_on: [],
        required: true,
        is_core: false,
      },
    ],
  },
  {
    id: "team",
    name: "Team",
    description: "Team members and credential tracking",
    icon: <Users className="h-5 w-5" />,
    requirements: [
      {
        requirement_id: "has_team_member",
        label: "Add Team Member",
        explanation: "Add your first team member to track credentials",
        group: "team",
        check_key: "team_members_exist",
        resolve: "add_team_member_button",
        depends_on: [],
        required: true,
        is_core: false,
      },
      {
        requirement_id: "has_credential_assignment",
        label: "Assign Credential",
        explanation: "Assign a credential to track compliance",
        group: "team",
        check_key: "credentials_assigned",
        resolve: "assign_credential_action",
        depends_on: ["has_team_member"],
        required: true,
        is_core: false,
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────

interface RequirementTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequirementTemplatesModal({ open, onOpenChange }: RequirementTemplatesModalProps) {
  const { configs, saveConfigs } = useRequirementAdmin();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const existingIds = useMemo(
    () => new Set(configs.map(c => c.requirement_id)),
    [configs]
  );

  const templateStatus = useMemo(() => {
    return TEMPLATES.map(t => {
      const newReqs = t.requirements.filter(r => !existingIds.has(r.requirement_id));
      const duplicates = t.requirements.length - newReqs.length;
      return { ...t, newReqs, duplicates, allExist: newReqs.length === 0 };
    });
  }, [existingIds]);

  const totalNew = useMemo(() => {
    let count = 0;
    for (const t of templateStatus) {
      if (selected.has(t.id)) count += t.newReqs.length;
    }
    return count;
  }, [selected, templateStatus]);

  const toggleTemplate = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    if (totalNew === 0 || applying) return;
    setApplying(true);

    try {
      const maxPriority = configs.length > 0
        ? Math.max(...configs.map(c => c.priority))
        : 0;

      let priorityCounter = maxPriority;
      const newConfigs: RequirementConfig[] = [];

      // Process templates in order to maintain correct dependency chains
      for (const template of TEMPLATES) {
        if (!selected.has(template.id)) continue;
        const status = templateStatus.find(t => t.id === template.id);
        if (!status) continue;

        for (const req of status.newReqs) {
          priorityCounter += 1;
          newConfigs.push({
            id: "",
            user_id: "",
            requirement_id: req.requirement_id,
            enabled: true,
            priority: priorityCounter,
            label: req.label,
            explanation: req.explanation,
            depends_on: req.depends_on,
            required: req.required,
            is_core: req.is_core,
            group: req.group,
            check_key: req.check_key,
            resolve: req.resolve,
            created_at: "",
            updated_at: "",
          });
        }
      }

      const updatedConfigs = [...configs, ...newConfigs];

      await saveConfigs.mutateAsync({
        configs: updatedConfigs,
        description: `Applied templates: ${[...selected].join(", ")}`,
      });

      const templateNames = [...selected].map(id =>
        TEMPLATES.find(t => t.id === id)?.name
      ).filter(Boolean).join(", ");

      toast.success("Templates applied", {
        description: `Added ${totalNew} requirement${totalNew > 1 ? "s" : ""} from ${templateNames}`,
      });

      setSelected(new Set());
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to apply templates", {
        description: err?.message || "Please try again",
      });
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4.5 w-4.5 text-primary" />
            Use Template
          </DialogTitle>
          <DialogDescription>
            Instantly generate requirement sets. Existing requirements won't be duplicated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-1">
          {templateStatus.map((template) => {
            const isSelected = selected.has(template.id);
            return (
              <Card
                key={template.id}
                className={cn(
                  "p-3 cursor-pointer transition-all border-2",
                  template.allExist
                    ? "opacity-50 cursor-not-allowed border-transparent"
                    : isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-muted/30"
                )}
                onClick={() => !template.allExist && toggleTemplate(template.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {template.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{template.name}</span>
                      {template.allExist ? (
                        <Badge variant="secondary" className="text-[10px] h-4 gap-0.5">
                          <Check className="h-2.5 w-2.5" />
                          Applied
                        </Badge>
                      ) : template.duplicates > 0 ? (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {template.newReqs.length} new
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {template.requirements.length} requirements
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.requirements.map(req => {
                        const exists = existingIds.has(req.requirement_id);
                        return (
                          <Badge
                            key={req.requirement_id}
                            variant="outline"
                            className={cn(
                              "text-[10px] h-4",
                              exists && "line-through opacity-50"
                            )}
                          >
                            {req.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {!template.allExist && (
                    <div className="shrink-0 mt-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleTemplate(template.id)}
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="pt-2 border-t border-border/40">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={totalNew === 0 || applying} className="gap-1.5">
            {applying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Applying…
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                Apply{totalNew > 0 ? ` (${totalNew})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  WORKSPACE_ROLE_LABELS,
  WORKSPACE_ROLE_DESCRIPTIONS,
  type WorkspaceRole,
} from "@/lib/workspace-permissions";

const ROLES: WorkspaceRole[] = [
  "workspace_admin",
  "supervisor",
  "safety_manager",
  "inventory_clerk",
  "viewer",
];

const roleBadgeClass: Record<WorkspaceRole, string> = {
  viewer: "bg-muted text-muted-foreground border-border",
  inventory_clerk: "bg-primary/10 text-primary border-primary/20",
  safety_manager: "bg-accent/10 text-accent-foreground border-accent/20",
  supervisor: "bg-secondary text-secondary-foreground border-secondary/20",
  workspace_admin: "bg-destructive/10 text-destructive border-destructive/20",
};

export const RoleGuide = () => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="p-4 sm:p-5">
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Role Guide</h3>
          <ChevronRight
            className={`h-3.5 w-3.5 text-muted-foreground/50 ml-auto transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          <div className="grid gap-2.5">
            {ROLES.map((role) => (
              <div
                key={role}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
              >
                <Badge
                  variant="outline"
                  className={`${roleBadgeClass[role]} shrink-0 mt-0.5`}
                >
                  {WORKSPACE_ROLE_LABELS[role]}
                </Badge>
                <p className="text-sm text-muted-foreground leading-snug">
                  {WORKSPACE_ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

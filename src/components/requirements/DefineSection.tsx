/**
 * DefineSection — Schema-driven requirement cards powered by extraction engine.
 * Shows: label, group, source, dependsOn, resolve, status, confidenceScore.
 * Badges: Core, Required/Optional.
 */
import { useMemo } from "react";
import type { RequirementConfig } from "@/hooks/use-requirement-admin";
import { useRequirementEngine } from "@/hooks/use-requirement-engine";
import type { ConfidenceMap } from "@/lib/extraction-engine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  Circle,
  GitBranch,
  Lock,
  Target,
} from "lucide-react";

interface DefineSectionProps {
  configs: RequirementConfig[];
  confidenceMap: ConfidenceMap;
}

const GROUP_LABELS: Record<string, string> = {
  assets: "Assets",
  calendar: "Calendar",
  team: "Team",
  pallet: "Pallet",
  trailer: "Trailer",
  custom: "Custom",
};

export function DefineSection({ configs, confidenceMap }: DefineSectionProps) {
  const { completionStatus } = useRequirementEngine();

  const grouped = useMemo(() => {
    const map: Record<string, RequirementConfig[]> = {};
    const sorted = [...configs].sort((a, b) => a.priority - b.priority);
    for (const c of sorted) {
      if (!map[c.group]) map[c.group] = [];
      map[c.group].push(c);
    }
    return map;
  }, [configs]);

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No requirements defined yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Use templates or create manually.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {GROUP_LABELS[group] || group}
            </span>
            <Badge variant="secondary" className="text-[10px] h-4">{items.length}</Badge>
          </div>

          <div className="space-y-2">
            {items.map((config) => {
              const isComplete = completionStatus[config.requirement_id] ?? false;
              const entry = confidenceMap[config.resolve];
              const confidence = entry?.score ?? 0;
              const needsReview = entry?.status === "needs_review";
              const source = entry ? "auto" : "manual";

              return (
                <Card
                  key={config.requirement_id}
                  className={cn(
                    "p-3 border-l-2 transition-colors",
                    !config.enabled
                      ? "opacity-50 border-l-muted"
                      : needsReview
                      ? "border-l-warning"
                      : isComplete
                      ? "border-l-primary"
                      : "border-l-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Row 1: status + label + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="shrink-0">
                          {isComplete ? (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{config.label}</span>
                        {config.is_core && (
                          <Badge variant="secondary" className="text-[10px] h-4 gap-0.5">
                            <Lock className="h-2.5 w-2.5" />
                            Core
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] h-4">
                          {config.required ? "Required" : "Optional"}
                        </Badge>
                        {needsReview && (
                          <Badge variant="warning" className="text-[10px] h-4 gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Review
                          </Badge>
                        )}
                      </div>

                      {/* Row 2: explanation */}
                      <p className="text-xs text-muted-foreground mt-1 ml-5">{config.explanation}</p>

                      {/* Row 3: metadata */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 ml-5">
                        <Badge variant="outline" className="text-[10px] h-4 font-normal">
                          {GROUP_LABELS[config.group] || config.group}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Target className="h-2.5 w-2.5" />
                          {config.resolve}
                        </span>
                        {config.depends_on.length > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <GitBranch className="h-2.5 w-2.5" />
                            {config.depends_on.join(", ")}
                          </span>
                        )}
                        <Badge
                          variant={source === "auto" ? "default" : "secondary"}
                          className="text-[10px] h-4"
                        >
                          {source}
                        </Badge>
                      </div>
                    </div>

                    {/* Confidence score */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={cn(
                        "text-xs font-mono tabular-nums",
                        confidence >= 80 ? "text-primary" :
                        confidence >= 60 ? "text-warning" :
                        "text-destructive"
                      )}>
                        {confidence}%
                      </span>
                      <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            confidence >= 80 ? "bg-primary" :
                            confidence >= 60 ? "bg-warning" :
                            "bg-destructive"
                          )}
                          style={{ width: `${confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

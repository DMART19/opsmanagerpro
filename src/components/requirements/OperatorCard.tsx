/**
 * OperatorCard — Interactive requirement card with inline editing panel.
 * Click to expand. Edit element, dependencies, confidence. Quick actions.
 */
import { useState, useCallback } from "react";
import type { RequirementConfig } from "@/hooks/use-requirement-admin";
import type { ConfidenceEntry, MappingEntry } from "@/lib/extraction-engine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Link2,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Target,
  Trash2,
  Wand2,
  X,
  XCircle,
} from "lucide-react";

interface OperatorCardProps {
  config: RequirementConfig;
  confidenceEntry?: ConfidenceEntry;
  mappingEntry?: MappingEntry;
  isComplete: boolean;
  isActive: boolean;
  allConfigs: RequirementConfig[];
  locked: boolean;
  manualMode: boolean;
  onUpdate: (updated: RequirementConfig) => void;
  onMarkComplete: (id: string) => void;
  onIgnore: (id: string) => void;
  onRerunItem: (id: string) => void;
}

export function OperatorCard({
  config,
  confidenceEntry,
  mappingEntry,
  isComplete,
  isActive,
  allConfigs,
  locked,
  manualMode,
  onUpdate,
  onMarkComplete,
  onIgnore,
  onRerunItem,
}: OperatorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editResolve, setEditResolve] = useState(config.resolve);
  const [editDeps, setEditDeps] = useState<string[]>(config.depends_on);
  const [editConfidence, setEditConfidence] = useState(confidenceEntry?.score ?? 0);

  const confidence = confidenceEntry?.score ?? 0;
  const isLowConfidence = confidence < 70;
  const status = mappingEntry?.status ?? "missing";

  const handleSaveInline = useCallback(() => {
    onUpdate({
      ...config,
      resolve: editResolve,
      depends_on: editDeps,
      updated_at: new Date().toISOString(),
    });
  }, [config, editResolve, editDeps, onUpdate]);

  const handleToggleDep = (depId: string) => {
    setEditDeps(prev =>
      prev.includes(depId) ? prev.filter(d => d !== depId) : [...prev, depId]
    );
  };

  const sameGroupConfigs = allConfigs.filter(
    c => c.group === config.group && c.requirement_id !== config.requirement_id && c.priority < config.priority
  );

  const lowConfidenceReason = isLowConfidence
    ? confidenceEntry?.factors.filter(f => !f.matched).map(f => f.rule).join(", ") || "Insufficient match signals"
    : null;

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-l-2 overflow-hidden",
        !config.enabled && "opacity-40",
        isActive && "border-l-primary ring-1 ring-primary/15",
        isComplete && "border-l-primary/50",
        isLowConfidence && !isComplete && "border-l-warning",
        !isActive && !isComplete && !isLowConfidence && "border-l-border",
      )}
    >
      {/* Collapsed header — always visible, clickable */}
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
        disabled={locked}
        aria-expanded={expanded}
      >
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>

        {/* Status icon */}
        <div className="shrink-0">
          {isComplete ? (
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-3 w-3 text-primary" />
            </div>
          ) : isActive ? (
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <Play className="h-2.5 w-2.5 text-primary-foreground fill-primary-foreground" />
            </div>
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-border" />
          )}
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-sm font-medium",
              isComplete && "line-through text-muted-foreground"
            )}>
              {config.label}
            </span>
            {config.is_core && (
              <Badge variant="secondary" className="text-[10px] h-4">Core</Badge>
            )}
            <Badge variant="outline" className="text-[10px] h-4">
              {config.required ? "Required" : "Optional"}
            </Badge>
          </div>
        </div>

        {/* Status + Confidence */}
        <div className="shrink-0 flex items-center gap-2">
          <StatusChip status={status} />
          <span className={cn(
            "text-xs font-mono tabular-nums",
            confidence >= 80 ? "text-primary" :
            confidence >= 60 ? "text-warning" :
            "text-destructive"
          )}>
            {confidence}%
          </span>
        </div>

        {/* Mapping indicator */}
        <div className="shrink-0">
          {mappingEntry?.page ? (
            <Badge variant="outline" className="text-[9px] h-4 font-mono">
              {mappingEntry.page}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] h-4 text-destructive border-destructive/20">
              unmapped
            </Badge>
          )}
        </div>
      </button>

      {/* Expanded inline panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-4">
          {/* Low confidence warning */}
          {isLowConfidence && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-warning/10 text-warning">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">Low Confidence</p>
                <p className="text-[11px] opacity-80">{lowConfidenceReason}</p>
              </div>
            </div>
          )}

          {/* WHY line */}
          <p className="text-xs text-muted-foreground italic">
            {config.explanation}
          </p>

          {/* Editable fields */}
          <div className="grid gap-3">
            {/* Element (resolve) */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Element
              </Label>
              <Input
                value={editResolve}
                onChange={e => setEditResolve(e.target.value)}
                className="h-8 text-xs font-mono"
                placeholder="element_id"
                disabled={locked || (!manualMode && !isLowConfidence)}
              />
            </div>

            {/* Dependencies */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> Dependencies
              </Label>
              <div className="flex flex-wrap gap-1">
                {sameGroupConfigs.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">No eligible dependencies</span>
                ) : (
                  sameGroupConfigs.map(dep => (
                    <button
                      key={dep.requirement_id}
                      onClick={() => handleToggleDep(dep.requirement_id)}
                      disabled={locked || (!manualMode && !isLowConfidence)}
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-md border transition-colors",
                        editDeps.includes(dep.requirement_id)
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {dep.label}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Confidence slider (manual mode only) */}
            {manualMode && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  Confidence Override: {editConfidence}%
                </Label>
                <Slider
                  value={[editConfidence]}
                  onValueChange={([v]) => setEditConfidence(v)}
                  min={0}
                  max={100}
                  step={5}
                  disabled={locked}
                />
              </div>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {(editResolve !== config.resolve || JSON.stringify(editDeps) !== JSON.stringify(config.depends_on)) && (
              <Button
                size="sm"
                className="gap-1 text-xs h-7"
                onClick={handleSaveInline}
                disabled={locked}
              >
                <Check className="h-3 w-3" />
                Save
              </Button>
            )}

            {isLowConfidence && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-7"
                onClick={() => onRerunItem(config.requirement_id)}
                disabled={locked}
              >
                <Wand2 className="h-3 w-3" />
                Auto Fix
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-7"
              onClick={() => onRerunItem(config.requirement_id)}
              disabled={locked}
            >
              <RefreshCw className="h-3 w-3" />
              Re-run AI
            </Button>

            {!isComplete && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-7"
                onClick={() => onMarkComplete(config.requirement_id)}
                disabled={locked}
              >
                <Check className="h-3 w-3" />
                Mark Complete
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs h-7 text-muted-foreground"
              onClick={() => onIgnore(config.requirement_id)}
              disabled={locked || config.is_core}
            >
              <XCircle className="h-3 w-3" />
              Ignore
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function StatusChip({ status }: { status: string }) {
  switch (status) {
    case "mapped":
      return (
        <Badge variant="secondary" className="text-[9px] h-4 gap-0.5 bg-primary/10 text-primary border-primary/20">
          <Link2 className="h-2.5 w-2.5" /> Mapped
        </Badge>
      );
    case "missing":
      return (
        <Badge variant="outline" className="text-[9px] h-4 gap-0.5 text-warning border-warning/20">
          <AlertTriangle className="h-2.5 w-2.5" /> Missing → Fix Now
        </Badge>
      );
    case "invalid":
      return (
        <Badge variant="destructive" className="text-[9px] h-4 gap-0.5">
          <XCircle className="h-2.5 w-2.5" /> Invalid → Fix Now
        </Badge>
      );
    default:
      return null;
  }
}

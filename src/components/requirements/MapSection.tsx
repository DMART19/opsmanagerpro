/**
 * MapSection — Mapping engine UI.
 * Requirement → Element → Page → Status → Confidence
 * Powered by runMappingEngine from extraction-engine.
 * Actions: Auto-map all, Validate.
 */
import { useMemo, useState } from "react";
import type { RequirementConfig } from "@/hooks/use-requirement-admin";
import {
  runMappingEngine,
  autoMapRequirements,
  type ConfidenceMap,
  type ElementRegistry,
  type PageSchema,
  type MappingEntry,
  type MappingStatus,
} from "@/lib/extraction-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  HelpCircle,
  Info,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  Wand2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MapSectionProps {
  configs: RequirementConfig[];
  confidenceMap: ConfidenceMap;
  elementRegistry: ElementRegistry;
  pageSchemas: PageSchema[];
  onAutoMap?: (updated: RequirementConfig[]) => void;
}

export function MapSection({ configs, confidenceMap, elementRegistry, pageSchemas, onAutoMap }: MapSectionProps) {
  const [validating, setValidating] = useState(false);

  // Run the mapping engine
  const mapping = useMemo(
    () => runMappingEngine(configs, elementRegistry, confidenceMap, pageSchemas),
    [configs, elementRegistry, confidenceMap, pageSchemas]
  );

  const handleAutoMap = () => {
    const updated = autoMapRequirements(configs, elementRegistry);
    const changed = updated.filter((c, i) => c.resolve !== configs[i]?.resolve).length;

    if (onAutoMap) {
      onAutoMap(updated);
    }

    if (changed > 0) {
      toast({ title: "Auto-map complete", description: `${changed} requirement${changed > 1 ? "s" : ""} remapped` });
    } else {
      toast({ title: "Auto-map complete", description: "All requirements already mapped" });
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    await new Promise(r => setTimeout(r, 600));
    setValidating(false);

    if (mapping.validationErrors.length === 0) {
      toast({ title: "All mappings valid", description: `${mapping.mappedCount} requirements verified` });
    } else {
      toast({
        title: `${mapping.validationErrors.length} issue${mapping.validationErrors.length > 1 ? "s" : ""} found`,
        description: mapping.validationErrors.slice(0, 2).join("; "),
        variant: "destructive",
      });
    }
  };

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No requirements to map.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-primary">
            <Check className="h-3 w-3" /> {mapping.mappedCount} mapped
          </span>
          {mapping.missingCount > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <HelpCircle className="h-3 w-3" /> {mapping.missingCount} missing
            </span>
          )}
          {mapping.invalidCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" /> {mapping.invalidCount} invalid
            </span>
          )}
          <span className="text-muted-foreground">
            · {mapping.overallConfidence}% confidence
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleAutoMap}>
            <Wand2 className="h-3 w-3" />
            Auto-map
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
            Validate
          </Button>
        </div>
      </div>

      {/* Validation errors */}
      {mapping.validationErrors.length > 0 && (
        <Card className="p-3 border-warning/30 bg-warning/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-warning">
                {mapping.validationErrors.length} validation issue{mapping.validationErrors.length > 1 ? "s" : ""}
              </p>
              {mapping.validationErrors.slice(0, 3).map((err, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">{err}</p>
              ))}
              {mapping.validationErrors.length > 3 && (
                <p className="text-[11px] text-muted-foreground">
                  +{mapping.validationErrors.length - 3} more
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Mapping table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requirement</TableHead>
              <TableHead>Element</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mapping.entries.map((entry) => (
              <MappingRow key={entry.requirementId} entry={entry} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Row Component ────────────────────────────────────────────────

function MappingRow({ entry }: { entry: MappingEntry }) {
  return (
    <TableRow className={cn(
      entry.status === "invalid" && "bg-destructive/5",
      entry.status === "missing" && "bg-warning/5",
    )}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{entry.label}</span>
          <Badge variant="outline" className="text-[10px] h-4 shrink-0">
            {entry.group}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-muted-foreground">
            {entry.resolve || "—"}
          </span>
          {entry.elementType && (
            <Badge variant="secondary" className="text-[9px] h-3.5">
              {entry.elementType.replace("_", " ")}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {entry.page ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {entry.page}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={entry.status} />
      </TableCell>
      <TableCell className="text-right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(
                "text-xs font-mono tabular-nums cursor-help inline-flex items-center gap-1",
                entry.confidence >= 80 ? "text-primary" :
                entry.confidence >= 60 ? "text-warning" :
                "text-destructive"
              )}>
                {entry.confidence}%
                <Info className="h-2.5 w-2.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px]">
              <p className="text-[11px] font-medium mb-1">Confidence factors</p>
              {entry.confidenceFactors.map((f, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">• {f}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: MappingStatus }) {
  switch (status) {
    case "mapped":
      return (
        <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-primary/10 text-primary border-primary/20">
          <Link2 className="h-2.5 w-2.5" />
          Mapped
        </Badge>
      );
    case "missing":
      return (
        <Badge variant="outline" className="text-[10px] h-5 gap-1 text-warning border-warning/20">
          <HelpCircle className="h-2.5 w-2.5" />
          Missing
        </Badge>
      );
    case "invalid":
      return (
        <Badge variant="destructive" className="text-[10px] h-5 gap-1">
          <AlertTriangle className="h-2.5 w-2.5" />
          Invalid
        </Badge>
      );
  }
}
